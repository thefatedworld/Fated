output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.postgres.connection_name
  description = "Cloud SQL connection name — used in Cloud Run env var CLOUD_SQL_CONNECTION_NAME"
}

output "cloud_sql_private_ip" {
  value       = google_sql_database_instance.postgres.private_ip_address
  description = "Cloud SQL private IP address"
  sensitive   = true
}

output "redis_host" {
  value       = google_redis_instance.fated_redis.host
  description = "Redis private IP — used in Cloud Run env var REDIS_HOST"
  sensitive   = true
}

output "artifact_registry_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.fated.repository_id}"
  description = "Artifact Registry URL for Docker images"
}

output "api_sa_email" {
  value       = google_service_account.api_sa.email
  description = "API service account email — use in Cloud Run service account"
}

output "cloudbuild_sa_email" {
  value       = google_service_account.cloudbuild_sa.email
  description = "Cloud Build service account email"
}

output "vpc_connector_name" {
  value       = google_vpc_access_connector.connector.name
  description = "VPC Access Connector name — required in Cloud Run config"
}

output "upload_bucket" {
  value       = google_storage_bucket.upload.name
}

output "delivery_bucket" {
  value       = google_storage_bucket.delivery.name
}

output "thumbnails_bucket" {
  value       = google_storage_bucket.thumbnails.name
}

output "distribution_bucket" {
  value       = google_storage_bucket.distribution.name
}

output "bigquery_dataset_id" {
  value       = google_bigquery_dataset.analytics.dataset_id
}
