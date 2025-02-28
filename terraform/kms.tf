# KMS key for database encryption
resource "aws_kms_key" "database" {
  description             = "KMS key for database encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  multi_region           = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.app_name}-database-key"
  })
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.app_name}-database"
  target_key_id = aws_kms_key.database.key_id
}

# KMS key for cache encryption
resource "aws_kms_key" "cache" {
  description             = "KMS key for cache encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  multi_region           = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.app_name}-cache-key"
  })
}

resource "aws_kms_alias" "cache" {
  name          = "alias/${var.app_name}-cache"
  target_key_id = aws_kms_key.cache.key_id
}

# KMS key for secrets encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for secrets encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  multi_region           = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.app_name}-secrets-key"
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.app_name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Data source for current AWS account
data "aws_caller_identity" "current" {} 