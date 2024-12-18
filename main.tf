provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = file(var.service_account_key)
}

# Enable required Google Cloud APIs
resource "google_project_service" "pubsub" {
  service = "pubsub.googleapis.com"
  disable_dependent_services = false
  disable_on_destroy = true
}

resource "google_project_service" "scheduler" {
  service = "cloudscheduler.googleapis.com"
  disable_dependent_services = false
  disable_on_destroy = true
}

# Initialize Firestore (this also sets it to Native mode)
resource "google_firestore_database" "argos_firestore_main" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage bucket for function source code
resource "google_storage_bucket" "functions_bucket" {
  name     = "${var.project_id}-functions"
  location = "US"
}

resource "null_resource" "prepare_functions" {
  triggers = {
    source_code_hash = sha256(join("", [for f in fileset(path.module, "functions/*.js") : filesha256(f)]))
  }

  provisioner "local-exec" {
    command = "bash prepare-functions.sh"
  }
}

resource "google_storage_bucket_object" "functions_zip" {
  name   = "functions.zip"
  bucket = google_storage_bucket.functions_bucket.name
  source = "./functions.zip"

  depends_on = [null_resource.prepare_functions]
}

# Cloud Functions setup
# Cloud Function: Log Visit
resource "google_cloudfunctions_function" "logVisit" {
  name        = "argos-visit-logger"
  description = "Logs user visits to Firestore"
  runtime     = "nodejs18"
  entry_point = "logVisit"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Assign Role
resource "google_cloudfunctions_function" "assignRole" {
  name        = "argos-assign-role"
  description = "Assigns roles to fingerprints"
  runtime     = "nodejs18"
  entry_point = "assignRole"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Get Visited Sites
resource "google_cloudfunctions_function" "getVisitedSites" {
  name        = "argos-get-visited-sites"
  description = "Retrieves visited sites for a fingerprint"
  runtime     = "nodejs18"
  entry_point = "getVisitedSites"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Add or Update Tags
resource "google_cloudfunctions_function" "addOrUpdateTags" {
  name        = "argos-add-or-update-tags"
  description = "Adds or updates tags for a fingerprint"
  runtime     = "nodejs18"
  entry_point = "addOrUpdateTags"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Update Roles Based on Tags
resource "google_cloudfunctions_function" "updateRolesBasedOnTags" {
  name        = "argos-update-roles-based-on-tags"
  description = "Updates roles based on tags for a fingerprint"
  runtime     = "nodejs18"
  entry_point = "updateRolesBasedOnTags"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Get Available Roles
resource "google_cloudfunctions_function" "getAvailableRoles" {
  name        = "argos-get-available-roles"
  description = "Retrieves available roles"
  runtime     = "nodejs18"
  entry_point = "getAvailableRoles"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name
  trigger_http = true

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }
}

# Cloud Function: Scheduled Cleanup
resource "google_cloudfunctions_function" "scheduledCleanup" {
  name        = "argos-scheduled-cleanup"
  description = "Performs scheduled cleanup of old data"
  runtime     = "nodejs18"
  entry_point = "scheduledCleanup"
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.functions_zip.name

  environment_variables = {
    FIRESTORE_PROJECT_ID = var.project_id
  }

  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.cleanup_trigger.name
  }
}

# PubSub topic for cleanup trigger
resource "google_pubsub_topic" "cleanup_trigger" {
  name = "argos-cleanup-trigger"
}

# Cloud Scheduler job to trigger cleanup
resource "google_cloud_scheduler_job" "cleanup_scheduler" {
  name        = "argos-cleanup-scheduler"
  description = "Triggers cleanup function every 24 hours"
  schedule    = "0 0 * * *"  # Run at midnight every day
  time_zone   = "UTC"

  pubsub_target {
    topic_name = google_pubsub_topic.cleanup_trigger.id
    data       = base64encode("{}")
  }
}

