# S3 bucket security module

variable "buckets" {
  description = "Map of bucket configurations"
  type = map(object({
    id      = string
    arn     = string
    replica = string
  }))
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
}

variable "replication_role" {
  description = "IAM role ARN for replication"
  type        = string
}

variable "log_bucket" {
  description = "Bucket ID for access logs"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
}

# Apply security configurations to each bucket
resource "aws_s3_bucket_versioning" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_logging" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  target_bucket = var.log_bucket
  target_prefix = "access-logs/${each.key}/"
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  rule {
    id     = "${each.key}-lifecycle"
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

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

resource "aws_s3_bucket_replication_configuration" "this" {
  for_each = var.buckets
  bucket   = each.value.id
  role     = var.replication_role

  rule {
    id     = "${each.key}-replication"
    status = "Enabled"

    destination {
      bucket        = each.value.replica
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = var.kms_key_arn
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_notification" "this" {
  for_each = var.buckets
  bucket   = each.value.id

  topic {
    topic_arn = aws_sns_topic.bucket_notifications[each.key].arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  }
}

resource "aws_sns_topic" "bucket_notifications" {
  for_each = var.buckets
  name     = "${each.key}-notifications"

  kms_master_key_id = var.kms_key_arn

  tags = var.tags
}

resource "aws_sns_topic_policy" "bucket_notifications" {
  for_each = var.buckets
  arn      = aws_sns_topic.bucket_notifications[each.key].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Notifications"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.bucket_notifications[each.key].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = var.buckets[each.key].arn
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {} 