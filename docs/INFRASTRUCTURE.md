# Infrastructure Setup Guide

This guide is for core developers who need to work with the GCP infrastructure and Terraform configuration.

## Prerequisites

1. **Google Cloud Platform Setup**
   ```bash
   # Install Google Cloud SDK
   brew install google-cloud-sdk   # macOS
   # or visit https://cloud.google.com/sdk/docs/install for other platforms

   # Login to GCP
   gcloud auth login
   gcloud auth application-default login

   # Set your project
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Terraform Setup**
   ```bash
   # Install Terraform
   brew install terraform    # macOS
   # or visit https://developer.hashicorp.com/terraform/downloads
   ```

## Initial Setup

1. **GCP Project Configuration**
   - Create a new GCP project
   - Enable required APIs:
     - Cloud Run
     - Cloud Build
     - Container Registry
     - Firestore
     - Secret Manager

2. **Service Account Setup**
   ```bash
   # Create a service account for Terraform
   gcloud iam service-accounts create terraform-admin \
     --display-name "Terraform Admin"

   # Grant necessary permissions
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:terraform-admin@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/owner"

   # Create and download the key
   gcloud iam service-accounts keys create ~/keys/gcp/argos-server/terraform-admin.json \
     --iam-account=terraform-admin@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## Terraform Configuration

1. **Initialize Terraform**
   ```bash
   cd terraform
   
   # Copy terraform.tfvars template
   cp terraform.tfvars.template terraform.tfvars

   # Edit your variables
   nano terraform.tfvars

   # Initialize Terraform
   terraform init
   ```

2. **Apply Infrastructure**
   ```bash
   # Plan changes
   terraform plan -out=tfplan

   # Apply changes
   terraform apply tfplan
   ```

## Infrastructure Components

Our infrastructure consists of:

1. **Cloud Run Service**
   - Runs the main API server
   - Auto-scales based on traffic
   - Configured with environment variables from Secret Manager

2. **Firestore Database**
   - NoSQL database for application data
   - Configured with security rules in `firebase/firestore.rules`

3. **Secret Manager**
   - Stores sensitive configuration
   - Automatically mounted to Cloud Run

4. **IAM & Security**
   - Service accounts for different components
   - Least privilege access principles
   - Network security policies

## Common Tasks

### Adding a New Secret
```bash
# Add to Secret Manager
gcloud secrets create NEW_SECRET \
  --replication-policy="automatic" \
  --data-file="/path/to/secret"

# Update Terraform
# Add to terraform/main.tf in the secrets section
```

### Updating Firestore Rules
1. Edit `firebase/firestore.rules`
2. Test locally with emulators
3. Deploy:
   ```bash
   npm run firebase:deploy
   ```

### Debugging Deployment Issues
```bash
# View Cloud Run logs
gcloud run services logs tail argos-server

# Check build status
gcloud builds list

# View service details
gcloud run services describe argos-server
```

## Best Practices

1. **State Management**
   - Use remote state storage (configured in Terraform)
   - Never commit `.tfstate` files
   - Use state locking for team environments

2. **Security**
   - Rotate service account keys regularly
   - Use workload identity where possible
   - Keep secrets in Secret Manager

3. **Cost Management**
   - Set up budget alerts
   - Use appropriate instance sizes
   - Configure auto-scaling appropriately

## Troubleshooting

Common issues and their solutions:

1. **Permission Denied**
   - Check service account roles
   - Verify key file location
   - Ensure APIs are enabled

2. **Deployment Failures**
   - Check Cloud Build logs
   - Verify resource quotas
   - Check service dependencies

3. **State Lock Issues**
   - Use `terraform force-unlock` if needed
   - Check for stale locks

## Additional Resources

- [GCP Documentation](https://cloud.google.com/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs) 