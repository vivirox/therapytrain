# Lambda function for canary analysis
resource "aws_lambda_function" "canary_analysis" {
  filename         = "canary_analysis.zip"
  function_name    = "${local.name_prefix}-canary-analysis"
  role            = aws_iam_role.lambda_canary.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      METRIC_NAMESPACE = "CanaryDeployment"
      ERROR_THRESHOLD  = "1"
      LATENCY_THRESHOLD = "1000"
    }
  }

  tags = local.service_tags.compute
}

# IAM role for canary analysis Lambda
resource "aws_iam_role" "lambda_canary" {
  name = "${local.name_prefix}-lambda-canary-role"

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

  tags = local.service_tags.compute
}

# IAM policy for canary analysis Lambda
resource "aws_iam_role_policy" "lambda_canary" {
  name = "${local.name_prefix}-lambda-canary-policy"
  role = aws_iam_role.lambda_canary.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "codedeploy:PutLifecycleEventHookExecutionStatus"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Alarms for Canary Deployment
resource "aws_cloudwatch_metric_alarm" "canary_error_rate" {
  alarm_name          = "${local.name_prefix}-canary-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "ErrorRate"
  namespace          = "CanaryDeployment"
  period             = "60"
  statistic          = "Average"
  threshold          = "1"
  alarm_description  = "This metric monitors error rate during canary deployment"

  dimensions = {
    Environment = "Green"
  }

  tags = local.service_tags.monitoring
}

resource "aws_cloudwatch_metric_alarm" "canary_latency" {
  alarm_name          = "${local.name_prefix}-canary-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Latency"
  namespace          = "CanaryDeployment"
  period             = "60"
  statistic          = "Average"
  threshold          = "1000"
  alarm_description  = "This metric monitors latency during canary deployment"

  dimensions = {
    Environment = "Green"
  }

  tags = local.service_tags.monitoring
}

# CodeDeploy Hooks
resource "aws_codedeploy_app" "canary" {
  name             = "${local.name_prefix}-canary"
  compute_platform = "ECS"

  tags = local.service_tags.compute
}

resource "aws_codedeploy_deployment_group" "canary" {
  app_name               = aws_codedeploy_app.canary.name
  deployment_group_name  = "${local.name_prefix}-canary-deployment"
  service_role_arn      = aws_iam_role.codedeploy.arn

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "STOP_DEPLOYMENT"
      wait_time_in_minutes = 60
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = aws_ecs_service.blue.name
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    alarms = [
      aws_cloudwatch_metric_alarm.canary_error_rate.name,
      aws_cloudwatch_metric_alarm.canary_latency.name
    ]
  }

  deployment_settings {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Environment"
      type  = "KEY_AND_VALUE"
      value = "Green"
    }
  }

  trigger_configuration {
    trigger_events = ["DeploymentSuccess", "DeploymentFailure"]
    trigger_name   = "deployment-trigger"
    trigger_target_arn = aws_sns_topic.deployment.arn
  }

  tags = local.service_tags.compute
}

# SNS Topic for Deployment Notifications
resource "aws_sns_topic" "deployment" {
  name = "${local.name_prefix}-deployment-notifications"

  tags = local.service_tags.monitoring
}

resource "aws_sns_topic_policy" "deployment" {
  arn = aws_sns_topic.deployment.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCodeDeployPublish"
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.deployment.arn
      }
    ]
  })
}

# Route53 Health Check for Deployment Verification
resource "aws_route53_health_check" "deployment" {
  fqdn              = aws_lb.app.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "${local.name_prefix}-deployment-health"
  }
}

# CloudWatch Dashboard for Deployment Monitoring
resource "aws_cloudwatch_dashboard" "deployment" {
  dashboard_name = "${local.name_prefix}-deployment"

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
            ["CanaryDeployment", "ErrorRate", "Environment", "Green"],
            ["CanaryDeployment", "Latency", "Environment", "Green"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Canary Deployment Metrics"
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
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.app.arn_suffix],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.app.arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Load Balancer Metrics"
        }
      }
    ]
  })
}

# Data source for current region
data "aws_region" "current" {}

# Outputs
output "canary_analysis_function" {
  description = "Lambda function name for canary analysis"
  value       = aws_lambda_function.canary_analysis.function_name
}

output "deployment_topic_arn" {
  description = "ARN of the deployment notifications SNS topic"
  value       = aws_sns_topic.deployment.arn
}

output "deployment_dashboard_name" {
  description = "Name of the deployment monitoring dashboard"
  value       = aws_cloudwatch_dashboard.deployment.dashboard_name
} 