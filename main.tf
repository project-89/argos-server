provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = file(var.service_account_key)
}

# Initialize Firestore
resource "google_firestore_database" "argos_firestore_main" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Prevent recreation
  lifecycle {
    prevent_destroy = true
  }
}

# Cloud Storage bucket for function source code
resource "google_storage_bucket" "functions_bucket" {
  name     = "${var.project_id}-functions"
  location = "US"

  # Prevent recreation
  lifecycle {
    prevent_destroy = true
  }
}

# Prepare functions source code
resource "null_resource" "prepare_functions" {
  triggers = {
    # Only trigger on actual code changes
    source_code_hash = sha256(join("", [for f in fileset(path.module, "functions/src/**/*.ts") : filesha256(f)]))
  }

  provisioner "local-exec" {
    command = "bash prepare-functions.sh"
  }
}

# Upload function source to bucket
resource "google_storage_bucket_object" "functions_source" {
  name   = "functions-source.zip"  # Fixed name to prevent unnecessary recreation
  bucket = google_storage_bucket.functions_bucket.name
  source = "./functions.zip"

  # Only update if content changes
  content_type = "application/zip"
  metadata = {
    hash = sha256(filebase64("./functions.zip"))
  }

  depends_on = [null_resource.prepare_functions]
}

# Main API Function (v2)
resource "google_cloudfunctions2_function" "main_api" {
  name        = "argos-api"
  description = "Main API function handling all endpoints"
  location    = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "api"
    source {
      storage_source {
        bucket = google_storage_bucket.functions_bucket.name
        object = google_storage_bucket_object.functions_source.name
      }
    }
  }

  service_config {
    max_instance_count = 100
    available_memory   = "256M"
    timeout_seconds    = 60
    environment_variables = {
      FIRESTORE_PROJECT_ID = var.project_id
      NODE_ENV = "production"
      API_KEY_ENCRYPTION_KEY = var.api_key_encryption_key
      API_KEY_ENCRYPTION_IV = var.api_key_encryption_iv
    }
  }

  # Ignore changes that don't affect functionality
  lifecycle {
    ignore_changes = [
      build_config[0].source[0].storage_source[0].generation,
      service_config[0].service_account_email,
      service_config[0].ingress_settings
    ]
  }
}

# Scheduled Cleanup Function (v2)
resource "google_cloudfunctions2_function" "scheduledCleanup" {
  name        = "argos-scheduled-cleanup"
  description = "Performs scheduled cleanup of old data"
  location    = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "scheduledCleanup"
    source {
      storage_source {
        bucket = google_storage_bucket.functions_bucket.name
        object = google_storage_bucket_object.functions_source.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 60
    environment_variables = {
      FIRESTORE_PROJECT_ID = var.project_id
      NODE_ENV = "production"
      API_KEY_ENCRYPTION_KEY = var.api_key_encryption_key
      API_KEY_ENCRYPTION_IV = var.api_key_encryption_iv
    }
  }

  # Ignore changes that don't affect functionality
  lifecycle {
    ignore_changes = [
      build_config[0].source[0].storage_source[0].generation,
      service_config[0].service_account_email,
      service_config[0].ingress_settings
    ]
  }
}

# Cloud Scheduler job
resource "google_cloud_scheduler_job" "cleanup" {
  name             = "argos-cleanup"
  description      = "Triggers cleanup function daily"
  schedule         = "0 0 * * *"  # Run at midnight every day
  time_zone        = "UTC"
  region           = var.region

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.scheduledCleanup.url
    oidc_token {
      service_account_email = "${var.project_id}@appspot.gserviceaccount.com"
    }
  }

  # Ignore changes to service account and other metadata
  lifecycle {
    ignore_changes = [
      http_target[0].oidc_token[0].service_account_email
    ]
  }
}

