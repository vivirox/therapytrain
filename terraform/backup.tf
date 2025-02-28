# AWS Backup vault
resource "aws_backup_vault" "main" {
  name        = "${var.app_name}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
  
  tags = var.tags
}

# KMS key for backup encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for AWS Backup encryption"
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
      },
      {
        Sid    = "Allow Backup Service"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.app_name}-backup-key"
  })
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.app_name}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# AWS Backup plan for databases
resource "aws_backup_plan" "database" {
  name = "${var.app_name}-database-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)" # Daily at 5 AM UTC

    lifecycle {
      delete_after = 35 # Keep backups for 35 days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.main.arn
      lifecycle {
        delete_after = 365 # Keep cross-region copies for 1 year
      }
    }
  }

  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * 1 *)" # Weekly on Sunday at 5 AM UTC

    lifecycle {
      delete_after = 90 # Keep weekly backups for 90 days
    }
  }

  tags = var.tags
}

# AWS Backup plan for container resources
resource "aws_backup_plan" "container" {
  name = "${var.app_name}-container-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 ? * * *)" # Daily at 4 AM UTC

    lifecycle {
      delete_after = 14 # Keep container backups for 14 days
    }
  }

  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 ? * 1 *)" # Weekly on Sunday at 4 AM UTC

    lifecycle {
      delete_after = 60 # Keep weekly backups for 60 days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.main.arn
      lifecycle {
        delete_after = 180 # Keep cross-region copies for 180 days
      }
    }
  }

  tags = var.tags
}

# IAM role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.app_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for AWS Backup
resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

resource "aws_iam_role_policy_attachment" "restore" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup.name
}

# Additional IAM policy for ECR backup
resource "aws_iam_role_policy" "backup_ecr" {
  name = "${var.app_name}-backup-ecr-policy"
  role = aws_iam_role.backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetRepositoryPolicy",
          "ecr:ListImages",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = aws_ecr_repository.app.arn
      }
    ]
  })
}

# AWS Backup selection for database resources
resource "aws_backup_selection" "database" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.app_name}-database-backup-selection"
  plan_id      = aws_backup_plan.database.id

  resources = [
    aws_rds_cluster.main.arn
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Environment"
    value = var.environment
  }
}

# AWS Backup selection for container resources
resource "aws_backup_selection" "container" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.app_name}-container-backup-selection"
  plan_id      = aws_backup_plan.container.id

  resources = [
    aws_ecr_repository.app.arn,
    aws_ecs_cluster.main.arn
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Environment"
    value = var.environment
  }
}

# AWS Backup selection for S3 resources
resource "aws_backup_selection" "s3" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.app_name}-s3-backup-selection"
  plan_id      = aws_backup_plan.database.id  # Using database backup plan for S3 due to similar retention requirements

  resources = [
    aws_s3_bucket.alb_logs.arn
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Environment"
    value = var.environment
  }
}

# Additional IAM policy for S3 backup
resource "aws_iam_role_policy" "backup_s3" {
  name = "${var.app_name}-backup-s3-policy"
  role = aws_iam_role.backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.alb_logs.arn,
          "${aws_s3_bucket.alb_logs.arn}/*"
        ]
      }
    ]
  })
}

# CloudWatch alarms for backup monitoring
resource "aws_cloudwatch_metric_alarm" "backup_job_failed" {
  alarm_name          = "${var.app_name}-backup-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors failed backup jobs"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "restore_job_failed" {
  alarm_name          = "${var.app_name}-restore-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RestoreJobsFailed"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors failed restore jobs"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = var.tags
}

# Additional backup monitoring metrics
resource "aws_cloudwatch_metric_alarm" "backup_job_duration" {
  alarm_name          = "${var.app_name}-backup-job-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "JobDuration"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Average"
  threshold           = "7200" # Alert if backup takes more than 2 hours
  alarm_description   = "This metric monitors backup job duration"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "backup_vault_size" {
  alarm_name          = "${var.app_name}-backup-vault-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupVaultSize"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Average"
  threshold           = "1099511627776" # Alert if vault size exceeds 1TB
  alarm_description   = "This metric monitors backup vault size"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = var.tags
}

# Additional CloudWatch metric for S3 backup monitoring
resource "aws_cloudwatch_metric_alarm" "s3_backup_size" {
  alarm_name          = "${var.app_name}-s3-backup-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupSizeBytes"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Average"
  threshold           = "107374182400" # Alert if backup size exceeds 100GB
  alarm_description   = "This metric monitors S3 backup size"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
    ResourceType    = "S3"
  }

  tags = var.tags
} 