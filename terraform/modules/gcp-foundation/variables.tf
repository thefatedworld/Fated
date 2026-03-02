variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "environment" {
  type        = string
  description = "Environment name (staging or prod)"
  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be 'staging' or 'prod'."
  }
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine tier"
  default     = "db-g1-small"
}

variable "db_password" {
  type        = string
  description = "Cloud SQL fatedworld_api user password"
  sensitive   = true
}
