#!/bin/bash

# Script to initialize Terraform configuration
# Usage: ./init-terraform.sh <aws_access_key> <aws_secret_key>

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <aws_access_key> <aws_secret_key>"
    echo "Example: $0 AKIA... wJalrXUtnFEMI..."
    exit 1
fi

AWS_ACCESS_KEY=$1
AWS_SECRET_KEY=$2

# Create S3 bucket for Terraform state
aws s3api create-bucket \
    --bucket gradiant-terraform-state \
    --region us-east-1 \
    --acl private \
    --profile default \
    --create-bucket-configuration LocationConstraint=us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket gradiant-terraform-state \
    --versioning-configuration Status=Enabled \
    --profile default

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket gradiant-terraform-state \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }' \
    --profile default

# Create Terraform configuration
echo "Creating Terraform variables file..."
cat > terraform.tfvars <<EOF
app_name   = "gradiant"
domain     = "gemcity.xyz"
tags = {
  Environment = "production"
  Project     = "gradiant"
}
EOF

# Create staging configuration
cat > staging.tfvars <<EOF
app_name   = "gradiant"
domain     = "gemcity.xyz"
tags = {
  Environment = "staging"
  Project     = "gradiant"
}
EOF

# Initialize Terraform
echo "Initializing Terraform..."
cd terraform
terraform init \
    -backend-config="access_key=$AWS_ACCESS_KEY" \
    -backend-config="secret_key=$AWS_SECRET_KEY"

# Create workspace for each environment
terraform workspace new development
terraform workspace new production

echo "Terraform initialization complete"

# Run initial plan
echo "Running initial Terraform plan..."
terraform workspace select development
terraform plan -var-file=environments/development.tfvars

echo "Setup complete! You can now run 'terraform apply' to create the infrastructure." 