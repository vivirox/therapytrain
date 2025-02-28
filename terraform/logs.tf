# OpenSearch Domain for log aggregation
resource "aws_opensearch_domain" "logs" {
  domain_name    = "${local.name_prefix}-logs"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type            = "t3.small.search"
    instance_count          = 2
    zone_awareness_enabled  = true
    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 20
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.app.arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = random_password.opensearch_master.result
    }
  }

  tags = local.service_tags.monitoring
}

# Random password for OpenSearch master user
resource "random_password" "opensearch_master" {
  length  = 32
  special = true
}

# Store OpenSearch credentials in Secrets Manager
resource "aws_secretsmanager_secret" "opensearch_master" {
  name                    = "${local.name_prefix}-opensearch-master"
  description             = "OpenSearch master user credentials"
  kms_key_id             = aws_kms_key.app.arn
  recovery_window_in_days = 7

  tags = local.service_tags.monitoring
}

resource "aws_secretsmanager_secret_version" "opensearch_master" {
  secret_id = aws_secretsmanager_secret.opensearch_master.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.opensearch_master.result
  })
}

# Kinesis Firehose for log delivery
resource "aws_kinesis_firehose_delivery_stream" "logs" {
  name        = "${local.name_prefix}-logs-firehose"
  destination = "opensearch"

  server_side_encryption {
    enabled  = true
    key_type = "CUSTOMER_MANAGED_CMK"
    key_arn  = aws_kms_key.app.arn
  }

  opensearch_configuration {
    domain_arn = aws_opensearch_domain.logs.arn
    role_arn   = aws_iam_role.firehose.arn
    index_name = "logs"
    type_name  = "_doc"

    buffering_interval = 60
    buffering_size    = 5

    s3_backup_mode = "FailedDocumentsOnly"

    processing_configuration {
      enabled = true

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = aws_lambda_function.log_processor.arn
        }
      }
    }
  }

  s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.logs.arn
    prefix     = "raw/"
    buffer_interval = 300
    buffer_size    = 5

    compression_format = "GZIP"
  }

  tags = local.service_tags.monitoring
}

# Lambda function for log processing
resource "aws_lambda_function" "log_processor" {
  filename         = "log_processor.zip"
  function_name    = "${local.name_prefix}-log-processor"
  role            = aws_iam_role.lambda.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 256

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = local.service_tags.monitoring
}

# IAM role for Kinesis Firehose
resource "aws_iam_role" "firehose" {
  name = "${local.name_prefix}-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })

  tags = local.service_tags.monitoring
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

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

  tags = local.service_tags.monitoring
}

# IAM policies
resource "aws_iam_role_policy" "firehose" {
  name = "${local.name_prefix}-firehose-policy"
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.logs.arn,
          "${aws_s3_bucket.logs.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "es:DescribeElasticsearchDomain",
          "es:DescribeElasticsearchDomains",
          "es:DescribeElasticsearchDomainConfig",
          "es:ESHttpPost",
          "es:ESHttpPut"
        ]
        Resource = [
          aws_opensearch_domain.logs.arn,
          "${aws_opensearch_domain.logs.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = [aws_lambda_function.log_processor.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${local.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = ["arn:aws:logs:*:*:*"]
      }
    ]
  })
}

# Outputs
output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.logs.endpoint
}

output "firehose_name" {
  description = "Kinesis Firehose delivery stream name"
  value       = aws_kinesis_firehose_delivery_stream.logs.name
}

output "log_processor_function" {
  description = "Lambda function name for log processing"
  value       = aws_lambda_function.log_processor.function_name
} 