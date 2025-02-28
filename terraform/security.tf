# KMS keys for different services
resource "aws_kms_key" "app" {
  description             = "KMS key for application encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  policy                 = data.aws_iam_policy_document.kms_key_policy.json

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
    actions = ["kms:*"]
    resources = ["*"]
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
  }
}

# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}-app-secrets"
  description             = "Application secrets for ${var.app_name}"
  kms_key_id             = aws_kms_key.app.arn
  recovery_window_in_days = 7

  tags = local.service_tags.security
}

# IAM roles and policies
resource "aws_iam_role" "app" {
  name = "${local.name_prefix}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.service_tags.security
}

# Application IAM policy
resource "aws_iam_role_policy" "app" {
  name = "${local.name_prefix}-app-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [aws_secretsmanager_secret.app.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.app.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = ["${aws_cloudwatch_log_group.app.arn}:*"]
      }
    ]
  })
}

# Security Groups
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app"
  description = "Security group for ${var.app_name} application"
  vpc_id      = aws_vpc.main.id

  tags = local.service_tags.security
}

resource "aws_security_group_rule" "app_ingress" {
  type              = "ingress"
  from_port         = var.container_port
  to_port           = var.container_port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "app_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}

# AWS WAF
resource "aws_wafv2_web_acl" "app" {
  count = var.enable_waf ? 1 : 0

  name        = "${local.name_prefix}-waf"
  description = "WAF for ${var.app_name}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${local.name_prefix}-waf-metric"
    sampled_requests_enabled  = true
  }

  tags = local.service_tags.security
}

# AWS Shield Advanced
resource "aws_shield_protection" "app" {
  count = var.enable_shield ? 1 : 0

  name         = "${local.name_prefix}-shield"
  resource_arn = aws_lb.app.arn

  tags = local.service_tags.security
}

# AWS GuardDuty
resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0

  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        enable = true
      }
    }
  }

  tags = local.service_tags.security
}

# Outputs
output "kms_key_arn" {
  description = "ARN of the application KMS key"
  value       = aws_kms_key.app.arn
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app.arn
}

output "iam_role_arn" {
  description = "ARN of the application IAM role"
  value       = aws_iam_role.app.arn
}

output "security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
} 