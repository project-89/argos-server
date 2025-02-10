variable "project_id" {
  description = "The ID of the Google Cloud project"
  type        = string
  default     = "argos-434718"  # Your project ID
}

variable "service_account_key" {
  description = "Path to the service account key JSON file"
  type        = string
  sensitive   = true  # Mark as sensitive
}

variable "region" {
  description = "The default region for resources"
  type        = string
  default     = "us-central1"
}
