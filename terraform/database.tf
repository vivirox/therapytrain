# Aurora Serverless v2 Database Configuration

# Random password for database
resource "random_password" "db_master_pass" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.environment}-aurora-master-password"
  description = "Master password for Aurora Serverless v2 cluster"
  kms_key_id  = aws_kms_key.secrets.arn
  
  rotation_rules {
    automatically_after_days = 30
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_master_pass.result
}

# Security group for database
resource "aws_security_group" "aurora" {
  name        = "${var.environment}-aurora-sg"
  description = "Security group for Aurora Serverless v2"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Allow PostgreSQL access from application"
  }

  tags = {
    Name        = "${var.environment}-aurora-sg"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Subnet group for database
resource "aws_db_subnet_group" "aurora" {
  name        = "${var.environment}-aurora-subnet-group"
  description = "Subnet group for Aurora Serverless v2"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name        = "${var.environment}-aurora-subnet-group"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Aurora Serverless v2 cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "${var.environment}-aurora-cluster"
  engine                = "aurora-postgresql"
  engine_mode           = "provisioned"
  engine_version        = "15.5"
  database_name         = "app"
  master_username       = "app_admin"
  master_password       = random_password.db_master_pass.result
  
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]
  
  backup_retention_period = 30
  preferred_backup_window = "03:00-04:00"
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database.arn
  
  iam_database_authentication_enabled = true
  deletion_protection                = true
  copy_tags_to_snapshot             = true
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
  
  skip_final_snapshot = var.environment != "prod"
  
  apply_immediately = var.environment != "prod"

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  
  tags = {
    Name        = "${var.environment}-aurora-cluster"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Aurora Cluster Parameter Group
resource "aws_rds_cluster_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "${var.environment}-aurora-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# Primary instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.environment}-aurora-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  auto_minor_version_upgrade     = true
  
  tags = {
    Name        = "${var.environment}-aurora-writer"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Read replica
resource "aws_rds_cluster_instance" "reader" {
  count              = var.environment == "prod" ? 1 : 0
  identifier         = "${var.environment}-aurora-reader"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name        = "${var.environment}-aurora-reader"
    Environment = var.environment
    Terraform   = "true"
  }
}

# RDS monitoring role
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Proxy
resource "aws_db_proxy" "main" {
  name                   = "${var.environment}-aurora-proxy"
  debug_logging          = true
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn              = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.aurora.id]
  vpc_subnet_ids         = aws_subnet.private[*].id

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "REQUIRED"
    secret_arn  = aws_secretsmanager_secret.db_password.arn
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    max_connections_percent = 100
  }
}

resource "aws_db_proxy_target" "main" {
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
  db_cluster_identifier  = aws_rds_cluster.main.id
}

# RDS Proxy IAM role
resource "aws_iam_role" "rds_proxy" {
  name = "${var.environment}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

resource "aws_iam_role_policy" "rds_proxy" {
  name = "${var.environment}-rds-proxy-policy"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [aws_secretsmanager_secret.db_password.arn]
      }
    ]
  })
}

# CloudWatch alarms for database monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.environment}-aurora-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic          = "Average"
  threshold          = "70"
  alarm_description  = "This metric monitors Aurora CPU utilization"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_memory" {
  alarm_name          = "${var.environment}-aurora-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic          = "Average"
  threshold          = "1000000000" # 1GB in bytes
  alarm_description  = "This metric monitors Aurora freeable memory"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# Output the database endpoints
output "db_writer_endpoint" {
  description = "The endpoint of the Aurora writer instance"
  value       = aws_rds_cluster.main.endpoint
}

output "db_reader_endpoint" {
  description = "The endpoint of the Aurora reader instance"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "db_proxy_endpoint" {
  description = "The endpoint of the RDS Proxy"
  value       = aws_db_proxy.main.endpoint
}

# Configure secret rotation
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Lambda function for secret rotation
resource "aws_lambda_function" "secret_rotation" {
  filename         = "lambda/secret_rotation.zip"
  function_name    = "${var.environment}-aurora-secret-rotation"
  role            = aws_iam_role.secret_rotation.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  
  reserved_concurrent_executions = 1
  
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }
  
  code_signing_config_arn = aws_lambda_code_signing_config.secret_rotation.arn
  
  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
      CLUSTER_ARN             = aws_rds_cluster.main.arn
    }
  }

  kms_key_arn = aws_kms_key.lambda.arn

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# Security group for Lambda
resource "aws_security_group" "lambda" {
  name        = "${var.environment}-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# DLQ for Lambda
resource "aws_sqs_queue" "dlq" {
  name = "${var.environment}-secret-rotation-dlq"
  kms_master_key_id = aws_kms_key.lambda.id
  
  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# Code signing for Lambda
resource "aws_lambda_code_signing_config" "secret_rotation" {
  allowed_publishers {
    signing_profile_version_arns = [aws_signer_signing_profile.secret_rotation.arn]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }
}

resource "aws_signer_signing_profile" "secret_rotation" {
  name_prefix = "secret_rotation"
  platform_id = "AWSLambda-SHA384-ECDSA"
}

# KMS key for Lambda
resource "aws_kms_key" "lambda" {
  description             = "KMS key for Lambda encryption"
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
        Sid    = "Allow Lambda Service"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
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
    Name = "${var.app_name}-lambda-key"
  })
}

resource "aws_kms_alias" "lambda" {
  name          = "alias/${var.app_name}-lambda"
  target_key_id = aws_kms_key.lambda.key_id
}

# IAM role for secret rotation Lambda
resource "aws_iam_role" "secret_rotation" {
  name = "${var.environment}-secret-rotation-role"

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

  tags = {
    Environment = var.environment
    Terraform   = "true"
  }
}

# IAM policy for secret rotation Lambda
resource "aws_iam_role_policy" "secret_rotation" {
  name = "${var.environment}-secret-rotation-policy"
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
        Resource = aws_secretsmanager_secret.db_password.arn
      },
      {
        Effect = "Allow"
        Action = [
          "rds:ModifyDBCluster"
        ]
        Resource = aws_rds_cluster.main.arn
      }
    ]
  })
} 