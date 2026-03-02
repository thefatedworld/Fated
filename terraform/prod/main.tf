terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    prefix = "terraform/state"
  }
}

module "foundation" {
  source = "../modules/gcp-foundation"

  project_id  = var.project_id
  environment = "prod"
  region      = var.region
  db_tier     = "db-custom-2-4096"  # 2 vCPU, 4GB RAM for prod
  db_password = var.db_password
}

output "cloud_sql_connection_name" {
  value = module.foundation.cloud_sql_connection_name
}

output "artifact_registry_url" {
  value = module.foundation.artifact_registry_url
}

output "api_sa_email" {
  value = module.foundation.api_sa_email
}
