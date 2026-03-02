variable "project_id" {
  type        = string
  description = "PROD GCP project ID"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "db_password" {
  type      = string
  sensitive = true
}
