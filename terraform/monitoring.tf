# CloudWatch Log Groups with KMS encryption
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/app/${local.name_prefix}"
  retention_in_days = local.config.log_retention_days
  kms_key_id        = aws_kms_key.app.arn

  tags = local.service_tags.monitoring
}

# CloudWatch Log Groups for WAF
resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/waf/${local.name_prefix}"
  retention_in_days = local.config.log_retention_days
  kms_key_id        = aws_kms_key.app.arn

  tags = local.service_tags.monitoring
}

# CloudWatch Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${local.name_prefix}-error-count"
  pattern        = "[timestamp, requestid, level = ERROR, ...]"
  log_group_name = aws_cloudwatch_log_group.app.name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "Custom/${var.app_name}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "latency" {
  name           = "${local.name_prefix}-latency"
  pattern        = "[timestamp, requestid, duration, ...]"
  log_group_name = aws_cloudwatch_log_group.app.name

  metric_transformation {
    name          = "RequestLatency"
    namespace     = "Custom/${var.app_name}"
    value         = "$duration"
    default_value = "0"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.name_prefix}-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ECS"
  period             = "300"
  statistic          = "Average"
  threshold          = var.alarm_cpu_threshold
  alarm_description  = "CPU utilization is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }

  tags = local.service_tags.monitoring
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${local.name_prefix}-memory-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "MemoryUtilization"
  namespace          = "AWS/ECS"
  period             = "300"
  statistic          = "Average"
  threshold          = var.alarm_memory_threshold
  alarm_description  = "Memory utilization is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }

  tags = local.service_tags.monitoring
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${local.name_prefix}-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "ErrorCount"
  namespace          = "Custom/${var.app_name}"
  period             = "300"
  statistic          = "Sum"
  threshold          = "10"
  alarm_description  = "Error rate is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  tags = local.service_tags.monitoring
}

resource "aws_cloudwatch_metric_alarm" "latency_high" {
  alarm_name          = "${local.name_prefix}-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "RequestLatency"
  namespace          = "Custom/${var.app_name}"
  period             = "300"
  statistic          = "Average"
  threshold          = "1000"
  alarm_description  = "Request latency is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  tags = local.service_tags.monitoring
}

# SNS Topics for different alert severities
resource "aws_sns_topic" "alerts" {
  name              = "${local.name_prefix}-alerts"
  kms_master_key_id = aws_kms_key.app.arn

  tags = local.service_tags.monitoring
}

resource "aws_sns_topic" "critical_alerts" {
  name              = "${local.name_prefix}-critical-alerts"
  kms_master_key_id = aws_kms_key.app.arn

  tags = local.service_tags.monitoring
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "alerts_slack" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# X-Ray
resource "aws_xray_sampling_rule" "app" {
  rule_name      = "${local.name_prefix}-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  tags = local.service_tags.monitoring
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "ECS CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "ECS Memory Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["Custom/${var.app_name}", "ErrorCount"]
          ]
          period = 300
          stat   = "Sum"
          region = var.region
          title  = "Application Errors"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["Custom/${var.app_name}", "RequestLatency"]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "Request Latency"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.app.name]
          ]
          period = 300
          stat   = "Sum"
          region = var.region
          title  = "ALB Request Count"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.app.name]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "ALB Response Time"
        }
      }
    ]
  })
}

# Outputs
output "log_group_name" {
  description = "Name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.app.name
}

output "dashboard_name" {
  description = "Name of the CloudWatch Dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "alert_topic_arn" {
  description = "ARN of the SNS alert topic"
  value       = aws_sns_topic.alerts.arn
}

output "critical_alert_topic_arn" {
  description = "ARN of the SNS critical alert topic"
  value       = aws_sns_topic.critical_alerts.arn
} 