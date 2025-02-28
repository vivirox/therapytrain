# IAM Policy Improvements

# Common policy for CloudWatch access
data "aws_iam_policy_document" "cloudwatch_access" {
  statement {
    effect = "Allow"
    actions = [
      "cloudwatch:GetMetricData",
      "cloudwatch:ListMetrics",
      "cloudwatch:GetMetricStatistics",
      "cloudwatch:DescribeAlarms"
    ]
    resources = [
      "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:metric-stream/${local.name_prefix}-*",
      "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:metric/${local.name_prefix}-*",
      "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:alarm:${local.name_prefix}-*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "logs:StartQuery",
      "logs:StopQuery",
      "logs:GetQueryResults",
      "logs:GetLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = [
      "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/${local.name_prefix}-*"
    ]
  }
}

# Common policy for X-Ray access
data "aws_iam_policy_document" "xray_access" {
  statement {
    effect = "Allow"
    actions = [
      "xray:GetTraceSummaries",
      "xray:BatchGetTraces"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Environment"
      values   = [local.config.environment]
    }
  }
}

# Update Grafana policy
resource "aws_iam_role_policy" "grafana" {
  name = "${local.name_prefix}-grafana-policy"
  role = aws_iam_role.grafana.id

  policy = data.aws_iam_policy_document.grafana_policy.json
}

data "aws_iam_policy_document" "grafana_policy" {
  source_policy_documents = [
    data.aws_iam_policy_document.cloudwatch_access.json,
    data.aws_iam_policy_document.xray_access.json
  ]
}

# Update CodeDeploy policy
resource "aws_iam_role_policy" "codedeploy" {
  name = "${local.name_prefix}-codedeploy-policy"
  role = aws_iam_role.codedeploy.id

  policy = data.aws_iam_policy_document.codedeploy_policy.json
}

data "aws_iam_policy_document" "codedeploy_policy" {
  statement {
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:CreateTaskSet",
      "ecs:UpdateServicePrimaryTaskSet",
      "ecs:DeleteTaskSet"
    ]
    resources = [
      "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:service/${var.ecs_cluster_name}/${local.name_prefix}-*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "elasticloadbalancing:DescribeTargetGroups",
      "elasticloadbalancing:DescribeListeners",
      "elasticloadbalancing:ModifyListener",
      "elasticloadbalancing:DescribeRules",
      "elasticloadbalancing:ModifyRule"
    ]
    resources = [
      aws_lb.app.arn,
      "${aws_lb.app.arn}/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      aws_lambda_function.canary_analysis.arn
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion"
    ]
    resources = [
      "${aws_s3_bucket.app.arn}/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "s3:ExistingObjectTag/Environment"
      values   = [local.config.environment]
    }
  }
}

# Update Lambda canary policy
resource "aws_iam_role_policy" "lambda_canary" {
  name = "${local.name_prefix}-lambda-canary-policy"
  role = aws_iam_role.lambda_canary.id

  policy = data.aws_iam_policy_document.lambda_canary_policy.json
}

data "aws_iam_policy_document" "lambda_canary_policy" {
  statement {
    effect = "Allow"
    actions = [
      "cloudwatch:GetMetricData",
      "cloudwatch:PutMetricData"
    ]
    resources = [
      "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:metric-stream/${local.name_prefix}-*",
      "arn:aws:cloudwatch:${var.region}:${data.aws_caller_identity.current.account_id}:metric/${local.name_prefix}-*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "codedeploy:PutLifecycleEventHookExecutionStatus"
    ]
    resources = [
      "arn:aws:codedeploy:${var.region}:${data.aws_caller_identity.current.account_id}:deploymentgroup:${aws_codedeploy_app.app.name}/${aws_codedeploy_deployment_group.app.deployment_group_name}"
    ]
  }
}

# Common VPC access policy for Lambda functions
data "aws_iam_policy_document" "vpc_access" {
  statement {
    effect = "Allow"
    actions = [
      "ec2:CreateNetworkInterface",
      "ec2:DeleteNetworkInterface",
      "ec2:DescribeNetworkInterfaces"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Environment"
      values   = [local.config.environment]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = [var.app_name]
    }
  }
}

# Common CloudWatch logging policy for Lambda functions
data "aws_iam_policy_document" "lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-*"
    ]
  }
}

# Common KMS access policy for Lambda functions
data "aws_iam_policy_document" "kms_access" {
  statement {
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = [aws_kms_key.app.arn]
  }
}

# Outputs
output "iam_policy_arns" {
  description = "ARNs of the IAM policies"
  value = {
    cloudwatch = aws_iam_role_policy.grafana.id
    codedeploy = aws_iam_role_policy.codedeploy.id
    lambda     = aws_iam_role_policy.lambda_canary.id
  }
} 