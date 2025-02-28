# CodeDeploy Application
resource "aws_codedeploy_app" "app" {
  count            = var.enable_blue_green_deployment ? 1 : 0
  compute_platform = "ECS"
  name             = var.app_name
}

# CodeDeploy Deployment Group
resource "aws_codedeploy_deployment_group" "app" {
  count                  = var.enable_blue_green_deployment ? 1 : 0
  app_name               = aws_codedeploy_app.app[0].name
  deployment_group_name  = "${var.app_name}-deployment-group"
  service_role_arn      = aws_iam_role.codedeploy.arn

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.app.name
  }

  deployment_settings {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  alarm_configuration {
    alarms = [aws_cloudwatch_metric_alarm.cpu_high.alarm_name]
  }

  trigger_configuration {
    trigger_events = [
      "DeploymentSuccess",
      "DeploymentFailure"
    ]
    trigger_name = "deployment-trigger"
    trigger_target_arn = aws_sns_topic.alerts.arn
  }
}

# IAM Role for CodeDeploy
resource "aws_iam_role" "codedeploy" {
  count = var.enable_blue_green_deployment ? 1 : 0
  name  = "${var.app_name}-codedeploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Role Policy for CodeDeploy
resource "aws_iam_role_policy_attachment" "codedeploy" {
  count      = var.enable_blue_green_deployment ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForECS"
  role       = aws_iam_role.codedeploy[0].name
}

# Additional Target Group for Blue-Green Deployment
resource "aws_lb_target_group" "blue" {
  count       = var.enable_blue_green_deployment ? 1 : 0
  name        = "${var.app_name}-blue-tg"
  port        = var.container_port
  protocol    = "HTTPS"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher            = "200"
    path               = var.health_check_path
    port               = "traffic-port"
    protocol           = "HTTPS"
    timeout            = 5
    unhealthy_threshold = 2
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-blue-tg"
  })
}

# Test Listener for Blue-Green Deployment
resource "aws_lb_listener" "test" {
  count             = var.enable_blue_green_deployment ? 1 : 0
  load_balancer_arn = aws_lb.app.arn
  port              = 8443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue[0].arn
  }
} 
