# Local variables for workspace-specific settings
locals {
  workspace_config = {
    development = {
      environment = "development"
      domain     = "dev.gemcity.xyz"
      tags = {
        Environment = "development"
        Project     = var.app_name
        Workspace   = terraform.workspace
      }
      container_cpu    = 512
      container_memory = 1024
      desired_count    = 1
      auto_scaling = {
        min_capacity = 1
        max_capacity = 2
      }
      enable_monitoring = false
      log_retention_days = 7
    }
    staging = {
      environment = "staging"
      domain     = "staging.gemcity.xyz"
      tags = {
        Environment = "staging"
        Project     = var.app_name
        Workspace   = terraform.workspace
      }
      container_cpu    = 1024
      container_memory = 2048
      desired_count    = 2
      auto_scaling = {
        min_capacity = 2
        max_capacity = 4
      }
      enable_monitoring = true
      log_retention_days = 14
    }
    production = {
      environment = "production"
      domain     = "gemcity.xyz"
      tags = {
        Environment = "production"
        Project     = var.app_name
        Workspace   = terraform.workspace
      }
      container_cpu    = 2048
      container_memory = 4096
      desired_count    = 3
      auto_scaling = {
        min_capacity = 3
        max_capacity = 6
      }
      enable_monitoring = true
      log_retention_days = 30
    }
  }

  # Get current workspace config or default to development
  current_workspace = contains(keys(local.workspace_config), terraform.workspace) ? terraform.workspace : "development"
  config           = local.workspace_config[local.current_workspace]
}

# Workspace validation
resource "null_resource" "workspace_validation" {
  lifecycle {
    precondition {
      condition     = contains(keys(local.workspace_config), terraform.workspace)
      error_message = "Invalid workspace '${terraform.workspace}'. Must be one of: ${join(", ", keys(local.workspace_config))}"
    }
  }
}

# Output current workspace configuration
output "workspace_config" {
  description = "Current workspace configuration"
  value = {
    workspace   = terraform.workspace
    environment = local.config.environment
    domain      = local.config.domain
    tags        = local.config.tags
  }
} 