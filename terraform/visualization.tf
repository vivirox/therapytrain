# Grafana workspace
resource "aws_grafana_workspace" "monitoring" {
  name                     = "${local.name_prefix}-grafana"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type         = "SERVICE_MANAGED"
  data_sources            = ["CLOUDWATCH", "PROMETHEUS", "XRAY"]
  
  configuration = jsonencode({
    unified_alerting = {
      enabled = true
    }
    auth = {
      disable_login_form = false
      disable_signout_menu = false
    }
    security = {
      allow_embedding = true
      cookie_secure   = true
    }
  })

  tags = local.service_tags.monitoring
}

# Grafana role
resource "aws_iam_role" "grafana" {
  name = "${local.name_prefix}-grafana-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "grafana.amazonaws.com"
        }
      }
    ]
  })

  tags = local.service_tags.monitoring
}

# Grafana policy
resource "aws_iam_role_policy" "grafana" {
  name = "${local.name_prefix}-grafana-policy"
  role = aws_iam_role.grafana.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:DescribeAlarms",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:GetQueryResults",
          "logs:GetLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "xray:GetTraceSummaries",
          "xray:BatchGetTraces"
        ]
        Resource = "*"
      }
    ]
  })
}

# OpenSearch Dashboards proxy
resource "aws_cognito_user_pool" "opensearch" {
  name = "${local.name_prefix}-opensearch-users"
  
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  tags = local.service_tags.monitoring
}

resource "aws_cognito_user_pool_domain" "opensearch" {
  domain       = "${local.name_prefix}-opensearch"
  user_pool_id = aws_cognito_user_pool.opensearch.id
}

resource "aws_cognito_identity_pool" "opensearch" {
  identity_pool_name = "${local.name_prefix}-opensearch"
  
  allow_unauthenticated_identities = false
  
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.opensearch.id
    provider_name           = aws_cognito_user_pool.opensearch.endpoint
    server_side_token_check = true
  }

  tags = local.service_tags.monitoring
}

resource "aws_cognito_user_pool_client" "opensearch" {
  name         = "${local.name_prefix}-opensearch"
  user_pool_id = aws_cognito_user_pool.opensearch.id

  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email", "openid"]
  callback_urls = ["https://${aws_opensearch_domain.logs.domain_endpoint}/_dashboards/app/home"]
  logout_urls   = ["https://${aws_opensearch_domain.logs.domain_endpoint}/_dashboards/app/home"]

  allowed_oauth_flows_user_pool_client = true
  generate_secret                      = true
}

# OpenSearch Dashboards access policy
resource "aws_opensearch_domain_policy" "logs" {
  domain_name = aws_opensearch_domain.logs.domain_name

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.opensearch_dashboards.arn
        }
        Action = [
          "es:ESHttp*"
        ]
        Resource = "${aws_opensearch_domain.logs.arn}/*"
      }
    ]
  })
}

# OpenSearch Dashboards role
resource "aws_iam_role" "opensearch_dashboards" {
  name = "${local.name_prefix}-opensearch-dashboards-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.opensearch.id
          }
        }
      }
    ]
  })

  tags = local.service_tags.monitoring
}

# OpenSearch Dashboards policy
resource "aws_iam_role_policy" "opensearch_dashboards" {
  name = "${local.name_prefix}-opensearch-dashboards-policy"
  role = aws_iam_role.opensearch_dashboards.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "es:ESHttp*"
        ]
        Resource = "${aws_opensearch_domain.logs.arn}/*"
      }
    ]
  })
}

# Outputs
output "grafana_workspace_url" {
  description = "Grafana workspace URL"
  value       = aws_grafana_workspace.monitoring.endpoint
}

output "opensearch_dashboards_url" {
  description = "OpenSearch Dashboards URL"
  value       = "https://${aws_opensearch_domain.logs.domain_endpoint}/_dashboards"
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID for OpenSearch Dashboards"
  value       = aws_cognito_user_pool.opensearch.id
}

output "cognito_identity_pool_id" {
  description = "Cognito identity pool ID for OpenSearch Dashboards"
  value       = aws_cognito_identity_pool.opensearch.id
} 