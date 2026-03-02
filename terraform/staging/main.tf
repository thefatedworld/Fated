terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    # Set via: terraform init -backend-config="bucket=fatedworld-tfstate-staging"
    prefix = "terraform/state"
  }
}

module "foundation" {
  source = "../modules/gcp-foundation"

  project_id  = var.project_id
  environment = "staging"
  region      = var.region
  db_tier     = "db-g1-small"
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

output "redis_host" {
  value     = module.foundation.redis_host
  sensitive = true
}
