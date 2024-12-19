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

variable "api_key_encryption_key" {
  description = "Base64-encoded 32-byte key for API key encryption"
  type        = string
  sensitive   = true
}

variable "api_key_encryption_iv" {
  description = "Base64-encoded 16-byte initialization vector for API key encryption"
  type        = string
  sensitive   = true
}
