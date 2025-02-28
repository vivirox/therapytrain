terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.4"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "gradiant-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "gradiant-terraform-locks"
    kms_key_id     = "alias/terraform-bucket-key"
  }
}

provider "vercel" {
  # Configure using VERCEL_TOKEN environment variable
}

provider "github" {
  # Configure using GITHUB_TOKEN environment variable
}

# AWS Provider Configuration
provider "aws" {
  region = var.region

  default_tags {
    tags = var.tags
  }
}

# KMS key for Terraform state encryption
resource "aws_kms_key" "terraform_bucket_key" {
  description             = "KMS key for Terraform state bucket"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "terraform-bucket-key"
  }
}

resource "aws_kms_alias" "terraform_bucket_key" {
  name          = "alias/terraform-bucket-key"
  target_key_id = aws_kms_key.terraform_bucket_key.key_id
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "gradiant-terraform-state"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "Terraform State"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_bucket_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "gradiant-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.terraform_bucket_key.arn
  }

  tags = {
    Name = "Terraform Lock Table"
  }
}

# Vercel Project
resource "vercel_project" "app" {
  name      = "therapytrain"
  framework = "nextjs"
  git_repository = {
    type = "github"
    repo = "username/therapytrain"
  }
  environment = [
    {
      key    = "NODE_ENV"
      value  = "production"
      target = ["production", "preview"]
    },
    {
      key    = "REDIS_URL"
      value  = "redis://redis:6379"
      target = ["production", "preview"]
    }
  ]
}

# GitHub Repository Settings
resource "github_repository" "app" {
  name        = "therapytrain"
  description = "TherapyTrain Application"
  visibility  = "private"
  has_issues  = true
  has_wiki    = true

  security_and_analysis {
    advanced_security {
      status = "enabled"
    }
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }
}

# GitHub Branch Protection
resource "github_branch_protection" "main" {
  repository_id = github_repository.app.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "security",
      "build",
      "deploy-staging"
    ]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }

  enforce_admins = true
}

# GitHub Actions Secrets
resource "github_actions_secret" "vercel_token" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_TOKEN"
  plaintext_value = var.vercel_token
}

resource "github_actions_secret" "vercel_org_id" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_ORG_ID"
  plaintext_value = var.vercel_org_id
}

resource "github_actions_secret" "vercel_project_id" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_PROJECT_ID"
  plaintext_value = vercel_project.app.id
}

resource "github_actions_secret" "slack_webhook_url" {
  repository      = github_repository.app.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = var.slack_webhook_url
}

resource "aws_s3_bucket" "app" {
  bucket = "gradiant"
  acl    = "private"

  tags = {
    Name        = "gradiant"
    Environment = "production"
    Description = "Gradiant Application"
  }
} 