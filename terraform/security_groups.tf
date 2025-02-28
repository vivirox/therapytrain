# Security Group Improvements

# Application Load Balancer security group
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for application load balancer - Controls inbound HTTPS traffic and outbound traffic to ECS tasks"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "ALB Security Group"
  })
}

resource "aws_security_group_rule" "alb_ingress_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  description       = "Allow inbound HTTPS traffic from specified CIDR blocks"
  security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "alb_egress_ecs" {
  type                     = "egress"
  from_port                = var.container_port
  to_port                  = var.container_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs.id
  description             = "Allow outbound traffic to ECS tasks on container port"
  security_group_id       = aws_security_group.alb.id
}

# ECS tasks security group
resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs-sg"
  description = "Security group for ECS tasks - Controls inbound traffic from ALB and outbound traffic to required services"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "ECS Tasks Security Group"
  })
}

resource "aws_security_group_rule" "ecs_ingress_alb" {
  type                     = "ingress"
  from_port                = var.container_port
  to_port                  = var.container_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  description             = "Allow inbound traffic from ALB on container port"
  security_group_id       = aws_security_group.ecs.id
}

resource "aws_security_group_rule" "ecs_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  prefix_list_ids   = [data.aws_prefix_list.s3.id]
  description       = "Allow outbound HTTPS traffic to S3"
  security_group_id = aws_security_group.ecs.id
}

resource "aws_security_group_rule" "ecs_egress_aurora" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.aurora.id
  description             = "Allow outbound PostgreSQL traffic to Aurora"
  security_group_id       = aws_security_group.ecs.id
}

# Aurora database security group
resource "aws_security_group" "aurora" {
  name        = "${local.name_prefix}-aurora-sg"
  description = "Security group for Aurora database - Controls inbound PostgreSQL traffic from ECS tasks"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "Aurora Database Security Group"
  })
}

resource "aws_security_group_rule" "aurora_ingress_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs.id
  description             = "Allow inbound PostgreSQL traffic from ECS tasks"
  security_group_id       = aws_security_group.aurora.id
}

# OpenSearch security group
resource "aws_security_group" "opensearch" {
  name        = "${local.name_prefix}-opensearch-sg"
  description = "Security group for OpenSearch - Controls inbound traffic from Kinesis Firehose and Lambda functions"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "OpenSearch Security Group"
  })
}

resource "aws_security_group_rule" "opensearch_ingress_firehose" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.firehose.id
  description             = "Allow inbound HTTPS traffic from Kinesis Firehose"
  security_group_id       = aws_security_group.opensearch.id
}

resource "aws_security_group_rule" "opensearch_ingress_lambda" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  description             = "Allow inbound HTTPS traffic from Lambda functions"
  security_group_id       = aws_security_group.opensearch.id
}

# Lambda functions security group
resource "aws_security_group" "lambda" {
  name        = "${local.name_prefix}-lambda-sg"
  description = "Security group for Lambda functions - Controls outbound traffic to required services"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "Lambda Functions Security Group"
  })
}

resource "aws_security_group_rule" "lambda_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  prefix_list_ids   = [data.aws_prefix_list.s3.id]
  description       = "Allow outbound HTTPS traffic to S3"
  security_group_id = aws_security_group.lambda.id
}

resource "aws_security_group_rule" "lambda_egress_opensearch" {
  type                     = "egress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.opensearch.id
  description             = "Allow outbound HTTPS traffic to OpenSearch"
  security_group_id       = aws_security_group.lambda.id
}

# Kinesis Firehose security group
resource "aws_security_group" "firehose" {
  name        = "${local.name_prefix}-firehose-sg"
  description = "Security group for Kinesis Firehose - Controls outbound traffic to OpenSearch"
  vpc_id      = var.vpc_id

  tags = merge(local.service_tags.network, {
    Name = "Kinesis Firehose Security Group"
  })
}

resource "aws_security_group_rule" "firehose_egress_opensearch" {
  type                     = "egress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.opensearch.id
  description             = "Allow outbound HTTPS traffic to OpenSearch"
  security_group_id       = aws_security_group.firehose.id
}

# Data sources
data "aws_prefix_list" "s3" {
  name = "com.amazonaws.${var.region}.s3"
}

# Variables
variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Should be restricted in production
}

# Outputs
output "security_group_ids" {
  description = "Map of security group IDs"
  value = {
    alb        = aws_security_group.alb.id
    ecs        = aws_security_group.ecs.id
    aurora     = aws_security_group.aurora.id
    opensearch = aws_security_group.opensearch.id
    lambda     = aws_security_group.lambda.id
    firehose   = aws_security_group.firehose.id
  }
} 