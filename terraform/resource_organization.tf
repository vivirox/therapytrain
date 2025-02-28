# Resource naming and tagging strategy
locals {
  # Resource naming convention
  name_prefix = "${var.app_name}-${local.config.environment}"
  
  # Common tags for all resources
  common_tags = merge(local.config.tags, {
    Application = var.app_name
    Environment = local.config.environment
    ManagedBy   = "terraform"
    Workspace   = terraform.workspace
    CreatedAt   = timestamp()
  })

  # Service-specific tags
  service_tags = {
    compute = merge(local.common_tags, {
      Service = "compute"
      Type    = "container"
    })
    database = merge(local.common_tags, {
      Service = "database"
      Type    = "rds"
    })
    storage = merge(local.common_tags, {
      Service = "storage"
      Type    = "s3"
    })
    network = merge(local.common_tags, {
      Service = "network"
      Type    = "vpc"
    })
    monitoring = merge(local.common_tags, {
      Service = "monitoring"
      Type    = "cloudwatch"
    })
    security = merge(local.common_tags, {
      Service = "security"
      Type    = "kms"
    })
  }

  # Resource lifecycle policies
  lifecycle_policies = {
    logs = {
      transition_to_ia    = 30
      transition_to_glacier = 90
      expiration_days    = 365
    }
    backups = {
      transition_to_ia    = 60
      transition_to_glacier = 180
      expiration_days    = 730
    }
    artifacts = {
      transition_to_ia    = 30
      transition_to_glacier = 90
      expiration_days    = 180
    }
  }
}

# Resource naming convention validator
resource "null_resource" "name_validator" {
  lifecycle {
    precondition {
      condition = can(regex("^[a-z0-9-]+$", var.app_name))
      error_message = "Application name must contain only lowercase letters, numbers, and hyphens."
    }
  }
}

# Tag policy
resource "aws_organizations_policy" "tagging" {
  name = "${local.name_prefix}-tag-policy"
  type = "TAG_POLICY"

  content = jsonencode({
    tags = {
      Environment = {
        tag_key = {
          @@assign = "Environment"
        }
        tag_value = {
          @@assign = ["development", "staging", "production"]
        }
        enforced_for = {
          @@assign = ["*"]
        }
      }
      Application = {
        tag_key = {
          @@assign = "Application"
        }
        tag_value = {
          @@assign = [var.app_name]
        }
        enforced_for = {
          @@assign = ["*"]
        }
      }
      ManagedBy = {
        tag_key = {
          @@assign = "ManagedBy"
        }
        tag_value = {
          @@assign = ["terraform"]
        }
        enforced_for = {
          @@assign = ["*"]
        }
      }
    }
  })
}

# Resource lifecycle policy for S3 buckets
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "log-lifecycle"
    status = "Enabled"

    transition {
      days          = local.lifecycle_policies.logs.transition_to_ia
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = local.lifecycle_policies.logs.transition_to_glacier
      storage_class = "GLACIER"
    }

    expiration {
      days = local.lifecycle_policies.logs.expiration_days
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    transition {
      days          = local.lifecycle_policies.backups.transition_to_ia
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = local.lifecycle_policies.backups.transition_to_glacier
      storage_class = "GLACIER"
    }

    expiration {
      days = local.lifecycle_policies.backups.expiration_days
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "artifact-lifecycle"
    status = "Enabled"

    transition {
      days          = local.lifecycle_policies.artifacts.transition_to_ia
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = local.lifecycle_policies.artifacts.transition_to_glacier
      storage_class = "GLACIER"
    }

    expiration {
      days = local.lifecycle_policies.artifacts.expiration_days
    }
  }
}

# Outputs
output "resource_naming" {
  description = "Resource naming convention"
  value = {
    prefix = local.name_prefix
    environment = local.config.environment
  }
}

output "resource_tags" {
  description = "Resource tagging strategy"
  value = {
    common = local.common_tags
    service = local.service_tags
  }
}

output "lifecycle_policies" {
  description = "Resource lifecycle policies"
  value = local.lifecycle_policies
} 