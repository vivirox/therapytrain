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

# Create Terraform state bucket if it doesn't exist
echo "Creating Terraform state bucket..."
aws s3api create-bucket \
    --bucket therapytrain-terraform-state \
    --region us-east-1 \
    --acl private \
    --profile default \
    --create-bucket-configuration LocationConstraint=us-east-1

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
    --bucket therapytrain-terraform-state \
    --versioning-configuration Status=Enabled \
    --profile default

# Enable encryption on the bucket
aws s3api put-bucket-encryption \
    --bucket therapytrain-terraform-state \
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

# Create Terraform variables file
echo "Creating Terraform variables file..."
cat > terraform/environments/development.tfvars << EOL
environment = "development"
region     = "us-east-1"
app_name   = "therapytrain"
domain     = "therapytrain.com"

tags = {
  Environment = "development"
  Project     = "therapytrain"
  ManagedBy   = "terraform"
}
EOL

cat > terraform/environments/production.tfvars << EOL
environment = "production"
region     = "us-east-1"
app_name   = "therapytrain"
domain     = "therapytrain.com"

tags = {
  Environment = "production"
  Project     = "therapytrain"
  ManagedBy   = "terraform"
}
EOL

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