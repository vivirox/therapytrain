# KMS and Secrets Management

# KMS key for application encryption
resource "aws_kms_key" "app" {
  description             = "KMS key for application encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region           = true

  policy = data.aws_iam_policy_document.kms_key_policy.json

  tags = local.service_tags.security
}

resource "aws_kms_alias" "app" {
  name          = "alias/${local.name_prefix}-app"
  target_key_id = aws_kms_key.app.key_id
}

# KMS key policy
data "aws_iam_policy_document" "kms_key_policy" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions = [
      "kms:Create*",
      "kms:Describe*",
      "kms:Enable*",
      "kms:List*",
      "kms:Put*",
      "kms:Update*",
      "kms:Revoke*",
      "kms:Disable*",
      "kms:Get*",
      "kms:Delete*",
      "kms:ScheduleKeyDeletion",
      "kms:CancelKeyDeletion"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalOrgID"
      values   = [data.aws_organizations_organization.current.id]
    }
  }

  statement {
    sid    = "Allow CloudWatch Logs"
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = ["logs.${var.region}.amazonaws.com"]
    }
    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*"
    ]
    resources = ["*"]
    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }

  statement {
    sid    = "Allow Lambda Service"
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt*",
      "kms:GenerateDataKey*"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalOrgID"
      values   = [data.aws_organizations_organization.current.id]
    }
  }
}

# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}-app-secrets"
  description             = "Application secrets for ${var.app_name}"
  kms_key_id             = aws_kms_key.app.arn
  recovery_window_in_days = 30

  replica {
    region = data.aws_region.secondary.name
  }

  tags = local.service_tags.security
}

# Secret rotation configuration
resource "aws_secretsmanager_secret_rotation" "app" {
  secret_id           = aws_secretsmanager_secret.app.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Lambda function for secret rotation
resource "aws_lambda_function" "secret_rotation" {
  filename         = "secret_rotation.zip"
  function_name    = "${local.name_prefix}-secret-rotation"
  role            = aws_iam_role.secret_rotation.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
      KMS_KEY_ID              = aws_kms_key.app.id
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.secret_rotation.id]
  }

  code_signing_config_arn = aws_lambda_code_signing_config.secret_rotation.arn

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.secret_rotation_dlq.arn
  }

  tags = local.service_tags.security
}

# Lambda code signing
resource "aws_lambda_code_signing_config" "secret_rotation" {
  allowed_publishers {
    signing_profile_version_arns = [aws_signer_signing_profile.secret_rotation.arn]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }
}

resource "aws_signer_signing_profile" "secret_rotation" {
  name_prefix = "${local.name_prefix}-secret-rotation"
  platform_id = "AWSLambda-SHA384-ECDSA"
}

# Dead letter queue for secret rotation
resource "aws_sqs_queue" "secret_rotation_dlq" {
  name                      = "${local.name_prefix}-secret-rotation-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id        = aws_kms_key.app.id

  tags = local.service_tags.security
}

# Security group for secret rotation Lambda
resource "aws_security_group" "secret_rotation" {
  name        = "${local.name_prefix}-secret-rotation-sg"
  description = "Security group for secret rotation Lambda function"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS outbound to AWS services"
  }

  tags = local.service_tags.security
}

# IAM role for secret rotation
resource "aws_iam_role" "secret_rotation" {
  name = "${local.name_prefix}-secret-rotation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.service_tags.security
}

# IAM policy for secret rotation
resource "aws_iam_role_policy" "secret_rotation" {
  name = "${local.name_prefix}-secret-rotation-policy"
  role = aws_iam_role.secret_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.app.arn
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment": local.config.environment
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.app.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment": local.config.environment
          }
        }
      }
    ]
  })
}

# Data sources
data "aws_organizations_organization" "current" {}
data "aws_region" "secondary" {
  provider = aws.secondary
}

# Outputs
output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.app.arn
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app.arn
}

output "secret_rotation_function_arn" {
  description = "ARN of the secret rotation Lambda function"
  value       = aws_lambda_function.secret_rotation.arn
} 