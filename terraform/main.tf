terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.4"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "gradiant-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "vercel" {
  # Configure using VERCEL_TOKEN environment variable
}

provider "github" {
  # Configure using GITHUB_TOKEN environment variable
}

# Vercel Project
resource "vercel_project" "app" {
  name      = "therapytrain"
  framework = "nextjs"
  git_repository = {
    type = "github"
    repo = "username/therapytrain"
  }
  environment = [
    {
      key    = "NODE_ENV"
      value  = "production"
      target = ["production", "preview"]
    },
    {
      key    = "REDIS_URL"
      value  = "redis://redis:6379"
      target = ["production", "preview"]
    }
  ]
}

# GitHub Repository Settings
resource "github_repository" "app" {
  name        = "therapytrain"
  description = "TherapyTrain Application"
  visibility  = "private"
  has_issues  = true
  has_wiki    = true

  security_and_analysis {
    advanced_security {
      status = "enabled"
    }
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }
}

# GitHub Branch Protection
resource "github_branch_protection" "main" {
  repository_id = github_repository.app.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "security",
      "build",
      "deploy-staging"
    ]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }

  enforce_admins = true
}

# GitHub Actions Secrets
resource "github_actions_secret" "vercel_token" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_TOKEN"
  plaintext_value = var.vercel_token
}

resource "github_actions_secret" "vercel_org_id" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_ORG_ID"
  plaintext_value = var.vercel_org_id
}

resource "github_actions_secret" "vercel_project_id" {
  repository      = github_repository.app.name
  secret_name     = "VERCEL_PROJECT_ID"
  plaintext_value = vercel_project.app.id
}

resource "github_actions_secret" "slack_webhook_url" {
  repository      = github_repository.app.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = var.slack_webhook_url
}

resource "aws_s3_bucket" "app" {
  bucket = "gradiant"
  acl    = "private"

  tags = {
    Name        = "gradiant"
    Environment = "production"
    Description = "Gradiant Application"
  }
} 