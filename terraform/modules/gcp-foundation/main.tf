terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# ─── Project & Region ─────────────────────────────────────────────────────────

locals {
  env          = var.environment
  project_id   = var.project_id
  region       = var.region
  db_password  = var.db_password
}

provider "google" {
  project = local.project_id
  region  = local.region
}

provider "google-beta" {
  project = local.project_id
  region  = local.region
}

# ─── Enable APIs ──────────────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "pubsub.googleapis.com",
    "cloudtasks.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "compute.googleapis.com",
    "redis.googleapis.com",
    "bigquery.googleapis.com",
    "firebase.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "clouderrorreporting.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

# ─── VPC & Private Networking ─────────────────────────────────────────────────

resource "google_compute_network" "fated_vpc" {
  name                    = "fated-vpc-${local.env}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "fated_subnet" {
  name          = "fated-subnet-${local.env}"
  ip_cidr_range = "10.1.0.0/24"
  region        = local.region
  network       = google_compute_network.fated_vpc.id
}

resource "google_compute_global_address" "private_ip_alloc" {
  name          = "fated-private-ip-${local.env}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.fated_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.fated_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
  depends_on              = [google_project_service.apis]
}

# VPC Access Connector (for Cloud Run → private VPC)
resource "google_vpc_access_connector" "connector" {
  name          = "fated-connector-${local.env}"
  region        = local.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.fated_vpc.name
  depends_on    = [google_project_service.apis]
}

# ─── Cloud SQL (Postgres) ─────────────────────────────────────────────────────

resource "google_sql_database_instance" "postgres" {
  name             = "fated-${local.env}"
  database_version = "POSTGRES_15"
  region           = local.region
  depends_on       = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier
    availability_type = local.env == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = local.env == "prod" ? 50 : 10
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.fated_vpc.id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = local.env == "prod" ? 14 : 7
      }
    }

    database_flags {
      name  = "max_connections"
      value = local.env == "prod" ? "200" : "50"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }

  deletion_protection = local.env == "prod"
}

resource "google_sql_database" "fatedworld" {
  name     = "fatedworld"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "api_user" {
  name     = "fatedworld_api"
  instance = google_sql_database_instance.postgres.name
  password = local.db_password
}

# ─── Artifact Registry ────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "fated" {
  repository_id = "fatedworld"
  location      = local.region
  format        = "DOCKER"
  description   = "FatedWorld Docker images — ${local.env}"
  depends_on    = [google_project_service.apis]
}

# ─── Service Accounts ─────────────────────────────────────────────────────────

resource "google_service_account" "api_sa" {
  account_id   = "fated-api-sa"
  display_name = "FatedWorld API Service Account (${local.env})"
}

resource "google_service_account" "cloudbuild_sa" {
  account_id   = "fated-cloudbuild-sa"
  display_name = "FatedWorld Cloud Build SA (${local.env})"
}

resource "google_service_account" "bq_reader_sa" {
  account_id   = "fated-bq-reader-sa"
  display_name = "FatedWorld BigQuery Reader (${local.env})"
}

resource "google_service_account" "distribution_sa" {
  account_id   = "fated-distribution-sa"
  display_name = "FatedWorld Distribution Worker (${local.env})"
}

# ─── IAM Bindings ─────────────────────────────────────────────────────────────

# API SA — Cloud SQL client
resource "google_project_iam_member" "api_cloudsql_client" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# API SA — Secret Manager accessor
resource "google_project_iam_member" "api_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# API SA — Pub/Sub publisher
resource "google_project_iam_member" "api_pubsub_publisher" {
  project = local.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# API SA — Cloud Tasks enqueuer
resource "google_project_iam_member" "api_tasks_enqueuer" {
  project = local.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# API SA — Cloud Run invoker (for internal task callbacks)
resource "google_project_iam_member" "api_run_invoker" {
  project = local.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# BigQuery reader SA — BQ data viewer on analytics dataset
resource "google_bigquery_dataset_iam_member" "bq_reader" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.bq_reader_sa.email}"
  depends_on = [google_bigquery_dataset.analytics]
}

# Cloud Build SA
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = local.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_ar_writer" {
  project = local.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_secret_version_manager" {
  project = local.project_id
  role    = "roles/secretmanager.secretVersionManager"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_redis_viewer" {
  project = local.project_id
  role    = "roles/redis.viewer"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = local.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

# ─── GCS Buckets ──────────────────────────────────────────────────────────────

resource "google_storage_bucket" "upload" {
  name                        = "fatedworld-upload-${local.env}"
  location                    = local.region
  uniform_bucket_level_access = true
  force_destroy               = local.env != "prod"

  cors {
    origin          = ["https://admin.fatedworld.com", "https://*.run.app"]
    method          = ["PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "x-goog-resumable"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "delivery" {
  name                        = "fatedworld-delivery-${local.env}"
  location                    = local.region
  uniform_bucket_level_access = true
  force_destroy               = local.env != "prod"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition { num_newer_versions = 3 }
    action { type = "Delete" }
  }
}

resource "google_storage_bucket" "thumbnails" {
  name                        = "fatedworld-thumbnails-${local.env}"
  location                    = local.region
  uniform_bucket_level_access = true
  force_destroy               = local.env != "prod"
}

resource "google_storage_bucket" "distribution" {
  name                        = "fatedworld-distribution-${local.env}"
  location                    = local.region
  uniform_bucket_level_access = true
  force_destroy               = local.env != "prod"
}

# API SA can write to upload bucket and distribution bucket
resource "google_storage_bucket_iam_member" "api_upload_writer" {
  bucket = google_storage_bucket.upload.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_storage_bucket_iam_member" "api_delivery_viewer" {
  bucket = google_storage_bucket.delivery.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api_sa.email}"
}

# Thumbnails — public access
resource "google_storage_bucket_iam_member" "thumbnails_public" {
  bucket = google_storage_bucket.thumbnails.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ─── Pub/Sub Topics ───────────────────────────────────────────────────────────

resource "google_pubsub_topic" "analytics_events" {
  name = "analytics-events-${local.env}"
}

resource "google_pubsub_topic" "episode_published" {
  name = "episode-published-${local.env}"
}

resource "google_pubsub_topic" "iap_refund" {
  name = "iap-refund-${local.env}"
}

resource "google_pubsub_topic" "distribution_jobs" {
  name = "distribution-jobs-${local.env}"
}

# Note: Pub/Sub → BigQuery direct subscription configured in Phase 4
# (requires full analytics schema alignment). The analytics module uses
# direct BigQuery streaming inserts in the meantime.

# ─── Cloud Tasks Queues ───────────────────────────────────────────────────────

resource "google_cloud_tasks_queue" "episode_publish" {
  name     = "episode-publish-${local.env}"
  location = local.region

  rate_limits {
    max_dispatches_per_second = 10
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts  = 3
    min_backoff   = "10s"
    max_backoff   = "300s"
    max_doublings = 3
  }
}

resource "google_cloud_tasks_queue" "notification_queue" {
  name     = "notification-queue-${local.env}"
  location = local.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 20
  }

  retry_config {
    max_attempts  = 5
    min_backoff   = "5s"
    max_backoff   = "120s"
    max_doublings = 3
  }
}

resource "google_cloud_tasks_queue" "distribution_export" {
  name     = "distribution-export-${local.env}"
  location = local.region

  rate_limits {
    max_dispatches_per_second = 2
    max_concurrent_dispatches = 3
  }

  retry_config {
    max_attempts  = 2
    min_backoff   = "30s"
    max_backoff   = "600s"
    max_doublings = 2
  }
}

# ─── Cloud Memorystore (Redis) ────────────────────────────────────────────────

resource "google_redis_instance" "fated_redis" {
  name           = "fated-redis-${local.env}"
  tier           = local.env == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = local.env == "prod" ? 2 : 1
  region         = local.region

  authorized_network = google_compute_network.fated_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "FatedWorld Redis ${local.env}"

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# ─── BigQuery ─────────────────────────────────────────────────────────────────

resource "google_bigquery_dataset" "analytics" {
  dataset_id  = "fatedworld_analytics"
  location    = "US"
  description = "FatedWorld analytics data — ${local.env}"

  default_table_expiration_ms = local.env == "prod" ? null : 30 * 24 * 60 * 60 * 1000 # 30d in staging

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    user_by_email = google_service_account.bq_reader_sa.email
  }
}

resource "google_bigquery_table" "events_raw" {
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "events_raw"
  deletion_protection = local.env == "prod"

  time_partitioning {
    type  = "DAY"
    field = "timestamp"
  }

  schema = jsonencode([
    { name = "event_id",    type = "STRING",    mode = "REQUIRED" },
    { name = "event_type",  type = "STRING",    mode = "REQUIRED" },
    { name = "user_id",     type = "STRING",    mode = "NULLABLE" },
    { name = "session_id",  type = "STRING",    mode = "NULLABLE" },
    { name = "episode_id",  type = "STRING",    mode = "NULLABLE" },
    { name = "series_id",   type = "STRING",    mode = "NULLABLE" },
    { name = "timestamp",   type = "TIMESTAMP", mode = "REQUIRED" },
    { name = "properties",  type = "JSON",      mode = "NULLABLE" },
  ])
}

# ─── Secret Manager (placeholder secrets — values set manually) ───────────────

resource "google_secret_manager_secret" "db_password" {
  secret_id  = "db-password-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_access_secret" {
  secret_id  = "jwt-access-secret-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_refresh_secret" {
  secret_id  = "jwt-refresh-secret-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "internal_api_secret" {
  secret_id  = "internal-api-secret-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "fcm_service_account" {
  secret_id  = "fcm-service-account-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id  = "anthropic-api-key-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "cdn_signing_key" {
  secret_id  = "cdn-signing-key-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

# CI constructs DATABASE_URL from db-password + Cloud SQL connection name and
# stores it here so Cloud Run can mount it as a secret env var.
resource "google_secret_manager_secret" "database_url" {
  secret_id  = "database-url-${local.env}"
  depends_on = [google_project_service.apis]
  replication {
    auto {}
  }
}

# ─── Migration Cloud Run Job ───────────────────────────────────────────────────
# Runs `prisma migrate deploy` against Cloud SQL.
# Executed manually or via CI before every Cloud Run deploy.

resource "google_cloud_run_v2_job" "migrate" {
  name     = "fated-migrate-${local.env}"
  location = local.region

  template {
    template {
      service_account = google_service_account.cloudbuild_sa.email

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.postgres.connection_name]
        }
      }

      containers {
        # Image is set to latest on every deploy via gcloud run jobs update
        image = "us-docker.pkg.dev/cloudrun/container/hello:latest"

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      max_retries = 1
      timeout     = "300s"
    }
  }

  depends_on = [
    google_sql_database_instance.postgres,
    google_project_service.apis,
  ]
}

# Grant Cloud Build SA access to run the migration job
resource "google_project_iam_member" "cloudbuild_jobs_runner" {
  project = local.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}
