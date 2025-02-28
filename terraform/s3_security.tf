# S3 bucket security configurations

# S3 bucket logging configuration
resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.app_name}-${local.config.environment}-access-logs"

  tags = merge(local.service_tags.storage, {
    Name = "S3 Access Logs"
  })
}

resource "aws_s3_bucket_versioning" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.app.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    id     = "access-logs-lifecycle"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket replication role
resource "aws_iam_role" "replication" {
  name = "${local.name_prefix}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = local.service_tags.security
}

# S3 bucket replication policy
resource "aws_iam_role_policy" "replication" {
  name = "${local.name_prefix}-s3-replication-policy"
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.app.arn,
          aws_s3_bucket.terraform_state.arn,
          aws_s3_bucket.cost_reports.arn
        ]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.app.arn}/*",
          "${aws_s3_bucket.terraform_state.arn}/*",
          "${aws_s3_bucket.cost_reports.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.app_replica.arn}/*",
          "${aws_s3_bucket.terraform_state_replica.arn}/*",
          "${aws_s3_bucket.cost_reports_replica.arn}/*"
        ]
      }
    ]
  })
}

# Replica buckets in secondary region
resource "aws_s3_bucket" "app_replica" {
  provider = aws.secondary
  bucket   = "${var.app_name}-${local.config.environment}-replica"

  tags = merge(local.service_tags.storage, {
    Name = "Application Replica"
  })
}

resource "aws_s3_bucket" "terraform_state_replica" {
  provider = aws.secondary
  bucket   = "${var.app_name}-${local.config.environment}-state-replica"

  tags = merge(local.service_tags.storage, {
    Name = "Terraform State Replica"
  })
}

resource "aws_s3_bucket" "cost_reports_replica" {
  provider = aws.secondary
  bucket   = "${var.app_name}-${local.config.environment}-cost-reports-replica"

  tags = merge(local.service_tags.storage, {
    Name = "Cost Reports Replica"
  })
}

# Apply security configurations to all buckets
module "s3_security" {
  source = "./modules/s3_security"

  buckets = {
    app = {
      id   = aws_s3_bucket.app.id
      arn  = aws_s3_bucket.app.arn
      replica = aws_s3_bucket.app_replica.id
    }
    terraform_state = {
      id   = aws_s3_bucket.terraform_state.id
      arn  = aws_s3_bucket.terraform_state.arn
      replica = aws_s3_bucket.terraform_state_replica.id
    }
    cost_reports = {
      id   = aws_s3_bucket.cost_reports.id
      arn  = aws_s3_bucket.cost_reports.arn
      replica = aws_s3_bucket.cost_reports_replica.id
    }
  }

  kms_key_arn     = aws_kms_key.app.arn
  replication_role = aws_iam_role.replication.arn
  log_bucket      = aws_s3_bucket.access_logs.id
  environment     = local.config.environment
  tags            = local.service_tags.storage
} 