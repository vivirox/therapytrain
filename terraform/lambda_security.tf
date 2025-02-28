# Lambda Security Improvements

# Lambda code signing configuration
resource "aws_lambda_code_signing_config" "app" {
  allowed_publishers {
    signing_profile_version_arns = [aws_signer_signing_profile.app.arn]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }

  description = "Code signing configuration for application Lambda functions"
}

resource "aws_signer_signing_profile" "app" {
  name_prefix = "${local.name_prefix}-lambda"
  platform_id = "AWSLambda-SHA384-ECDSA"

  tags = local.service_tags.security
}

# Dead letter queue for Lambda functions
resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "${local.name_prefix}-lambda-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id        = aws_kms_key.app.id

  tags = local.service_tags.compute
}

# Update canary analysis Lambda
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

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  code_signing_config_arn = aws_lambda_code_signing_config.app.arn

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 5

  tags = local.service_tags.compute
}

# Update log processor Lambda
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
      OPENSEARCH_ENDPOINT = aws_opensearch_domain.logs.endpoint
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  code_signing_config_arn = aws_lambda_code_signing_config.app.arn

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 10

  tags = local.service_tags.compute
}

# Update secret rotation Lambda
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
    security_group_ids = [aws_security_group.lambda.id]
  }

  code_signing_config_arn = aws_lambda_code_signing_config.app.arn

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 2

  tags = local.service_tags.compute
}

# CloudWatch Logs encryption
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = toset([
    "/aws/lambda/${aws_lambda_function.canary_analysis.function_name}",
    "/aws/lambda/${aws_lambda_function.log_processor.function_name}",
    "/aws/lambda/${aws_lambda_function.secret_rotation.function_name}"
  ])

  name              = each.value
  retention_in_days = var.log_retention_days
  kms_key_id       = aws_kms_key.app.arn

  tags = local.service_tags.monitoring
}

# Lambda function URLs (if needed)
resource "aws_lambda_function_url" "canary_analysis" {
  function_name      = aws_lambda_function.canary_analysis.function_name
  authorization_type = "AWS_IAM"

  cors {
    allow_credentials = true
    allow_origins     = ["https://${local.config.domain}"]
    allow_methods     = ["POST"]
    allow_headers     = ["content-type", "x-amz-date", "authorization", "x-api-key"]
    expose_headers    = ["x-amz-date"]
    max_age          = 3600
  }
}

# Lambda provisioned concurrency (if needed)
resource "aws_lambda_provisioned_concurrency_config" "canary_analysis" {
  function_name                     = aws_lambda_function.canary_analysis.function_name
  provisioned_concurrent_executions = 2
  qualifier                        = aws_lambda_function.canary_analysis.version
}

# Lambda insights
resource "aws_lambda_function_event_invoke_config" "app" {
  for_each = {
    canary_analysis = aws_lambda_function.canary_analysis.function_name
    log_processor   = aws_lambda_function.log_processor.function_name
    secret_rotation = aws_lambda_function.secret_rotation.function_name
  }

  function_name = each.value

  destination_config {
    on_failure {
      destination = aws_sqs_queue.lambda_dlq.arn
    }
  }

  maximum_retry_attempts = 2
}

# Outputs
output "lambda_function_arns" {
  description = "Map of Lambda function ARNs"
  value = {
    canary_analysis = aws_lambda_function.canary_analysis.arn
    log_processor   = aws_lambda_function.log_processor.arn
    secret_rotation = aws_lambda_function.secret_rotation.arn
  }
}

output "lambda_dlq_arn" {
  description = "ARN of Lambda dead letter queue"
  value       = aws_sqs_queue.lambda_dlq.arn
}

output "lambda_code_signing_config_arn" {
  description = "ARN of Lambda code signing configuration"
  value       = aws_lambda_code_signing_config.app.arn
} 