// MongoDB server configuration

// Variables
variable "mongodb_machine_type" {
  description = "Machine type for MongoDB server"
  type        = string
  default     = "e2-medium"
}

variable "mongodb_disk_size" {
  description = "Disk size for MongoDB server in GB"
  type        = number
  default     = 50
}

variable "mongodb_region" {
  description = "Region for MongoDB server"
  type        = string
  default     = "us-central1"
}

variable "mongodb_zone" {
  description = "Zone for MongoDB server"
  type        = string
  default     = "us-central1-a"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

// Network configuration
resource "google_compute_network" "mongodb_network" {
  name                    = "mongodb-network-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "mongodb_subnetwork" {
  name          = "mongodb-subnetwork-${var.environment}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.mongodb_region
  network       = google_compute_network.mongodb_network.id
}

// Firewall rules
resource "google_compute_firewall" "mongodb_firewall" {
  name    = "mongodb-firewall-${var.environment}"
  network = google_compute_network.mongodb_network.name

  allow {
    protocol = "tcp"
    ports    = ["22", "27017"]
  }

  source_ranges = ["0.0.0.0/0"] // Restrict this in production
  target_tags   = ["mongodb"]
}

// MongoDB instance
resource "google_compute_instance" "mongodb" {
  name         = "mongodb-${var.environment}"
  machine_type = var.mongodb_machine_type
  zone         = var.mongodb_zone
  tags         = ["mongodb"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
      size  = var.mongodb_disk_size
    }
  }

  network_interface {
    network    = google_compute_network.mongodb_network.name
    subnetwork = google_compute_subnetwork.mongodb_subnetwork.name
    
    access_config {
      // Ephemeral public IP
    }
  }

  metadata = {
    startup-script = file("${path.module}/../server/scripts/mongodb_setup.sh")
  }

  service_account {
    scopes = ["cloud-platform"]
  }
}

// Outputs
output "mongodb_private_ip" {
  value = google_compute_instance.mongodb.network_interface.0.network_ip
}

output "mongodb_public_ip" {
  value = google_compute_instance.mongodb.network_interface.0.access_config.0.nat_ip
}

output "mongodb_connection_string" {
  value     = "mongodb://argosUser:<password>@${google_compute_instance.mongodb.network_interface.0.access_config.0.nat_ip}:27017/argosDB"
  sensitive = true
}

// Note: You'll need to SSH into the instance to get the actual password from /root/mongodb_credentials.txt 