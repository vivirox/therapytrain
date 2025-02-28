variable "vercel_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_org_id" {
  description = "Vercel organization ID"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment (development/staging/production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "gradiant"
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
  default     = "gemcity.xyz"
}

variable "tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "gradiant"
    ManagedBy   = "terraform"
    Environment = "development"
  }
}

variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# State Management Variables
variable "state_bucket" {
  description = "Name of the S3 bucket for Terraform state"
  type        = string
  default     = "gradiant-terraform-state"
}

variable "state_dynamodb_table" {
  description = "Name of the DynamoDB table for state locking"
  type        = string
  default     = "gradiant-terraform-locks"
}

variable "state_kms_key_deletion_window" {
  description = "Deletion window in days for KMS key"
  type        = number
  default     = 10
}

variable "state_backup_retention" {
  description = "Number of days to retain state backups"
  type        = number
  default     = 30
}

# Resource Configuration Variables
variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3000
}

variable "container_cpu" {
  description = "CPU units for the container (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "container_memory" {
  description = "Memory for the container in MB"
  type        = number
  default     = 2048
}

variable "desired_count" {
  description = "Desired number of container instances"
  type        = number
  default     = 2
}

variable "health_check_path" {
  description = "Path for health check"
  type        = string
  default     = "/health"
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

variable "enable_container_insights" {
  description = "Enable Container Insights for ECS cluster"
  type        = bool
  default     = true
}

variable "ssl_policy" {
  description = "SSL policy for ALB HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-2016-08"
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring for resources"
  type        = bool
  default     = true
}

variable "alarm_cpu_threshold" {
  description = "CPU utilization threshold for alarm"
  type        = number
  default     = 85
}

variable "alarm_memory_threshold" {
  description = "Memory utilization threshold for alarm"
  type        = number
  default     = 85
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for ECS service"
  type        = bool
  default     = true
}

variable "auto_scaling_min_capacity" {
  description = "Minimum number of tasks for auto scaling"
  type        = number
  default     = 2
}

variable "auto_scaling_max_capacity" {
  description = "Maximum number of tasks for auto scaling"
  type        = number
  default     = 4
}

variable "enable_blue_green_deployment" {
  description = "Enable blue-green deployment"
  type        = bool
  default     = true
}

# Cost Management Variables
variable "enable_cost_allocation" {
  description = "Enable cost allocation tags"
  type        = bool
  default     = true
}

variable "budget_alert_threshold" {
  description = "Threshold for budget alerts (percentage)"
  type        = number
  default     = 80
}

variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 1000
}

# Security Variables
variable "enable_waf" {
  description = "Enable WAF for application load balancer"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty"
  type        = bool
  default     = true
} 