# Enable cost allocation tags
resource "aws_ce_tags" "cost_allocation" {
  count = var.enable_cost_allocation ? 1 : 0

  tags = [
    "Environment",
    "Project",
    "ManagedBy",
    "Workspace"
  ]
}

# AWS Budgets
resource "aws_budgets_budget" "monthly" {
  name              = "${var.app_name}-${local.config.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_amount
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.budget_alert_threshold
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Environment$${local.config.environment}",
      "Project$${var.app_name}"
    ]
  }
}

# Cost and Usage Report
resource "aws_cur_report_definition" "app" {
  report_name                = "${var.app_name}-${local.config.environment}-cost-report"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                 = aws_s3_bucket.cost_reports.id
  s3_region                 = var.region
  s3_prefix                 = "cost-reports"
  report_versioning         = "OVERWRITE_REPORT"
  refresh_closed_reports    = true
  
  depends_on = [aws_s3_bucket.cost_reports]
}

# S3 bucket for cost reports
resource "aws_s3_bucket" "cost_reports" {
  bucket = "${var.app_name}-${local.config.environment}-cost-reports"

  tags = merge(local.config.tags, {
    Name = "Cost Reports"
  })
}

resource "aws_s3_bucket_versioning" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.terraform_bucket_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id

  rule {
    id     = "cost-reports-lifecycle"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Cost Explorer
resource "aws_ce_cost_category" "environment" {
  name = "Environment"

  rule {
    value = "Production"
    rule {
      dimension {
        key   = "TAGS"
        values = ["Environment$production"]
      }
    }
  }

  rule {
    value = "Staging"
    rule {
      dimension {
        key   = "TAGS"
        values = ["Environment$staging"]
      }
    }
  }

  rule {
    value = "Development"
    rule {
      dimension {
        key   = "TAGS"
        values = ["Environment$development"]
      }
    }
  }

  rule {
    value = "Other"
    rule {
      dimension {
        key   = "TAGS"
        values = ["Environment$*"]
      }
    }
  }
}

# Outputs
output "cost_reports_bucket" {
  description = "Name of the S3 bucket containing cost reports"
  value       = aws_s3_bucket.cost_reports.id
}

output "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  value       = var.monthly_budget_amount
}

output "budget_alert_threshold" {
  description = "Budget alert threshold percentage"
  value       = var.budget_alert_threshold
} 