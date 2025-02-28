# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.app_name}-cache-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = var.tags
}

# ElastiCache parameter group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${var.app_name}-cache-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  tags = var.tags
}

# Security group for ElastiCache
resource "aws_security_group" "cache" {
  name        = "${var.app_name}-cache-sg"
  description = "Security group for ElastiCache Redis cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Allow Redis access from application"
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-cache-sg"
  })
}

# ElastiCache replication group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "${var.app_name}-cache"
  replication_group_description = "Redis cache cluster"
  node_type                     = "cache.t4g.medium"
  port                          = 6379
  parameter_group_name          = aws_elasticache_parameter_group.main.name
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.cache.id]
  automatic_failover_enabled    = true
  multi_az_enabled             = true
  num_cache_clusters           = 2
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  kms_key_id                  = aws_kms_key.cache.arn
  auth_token                  = random_password.redis_auth_token.result
  
  engine               = "redis"
  engine_version      = "7.0"
  
  maintenance_window   = "sun:05:00-sun:06:00"
  snapshot_window     = "04:00-05:00"
  snapshot_retention_limit = 7

  auto_minor_version_upgrade = true
  
  tags = var.tags
}

# Random password for Redis AUTH
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# Store Redis AUTH token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.app_name}-redis-auth"
  description = "Redis AUTH token"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth_token.result
}

# CloudWatch alarms for cache monitoring
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.app_name}-cache-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "Redis cluster CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.app_name}-cache-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "100000000" # 100MB in bytes
  alarm_description   = "Redis cluster freeable memory"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_connections" {
  alarm_name          = "${var.app_name}-cache-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "Redis cluster current connections"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_evictions" {
  alarm_name          = "${var.app_name}-cache-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "Redis cluster evictions"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = var.tags
}

# Output the cache endpoints
output "cache_primary_endpoint" {
  description = "The primary endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "cache_reader_endpoint" {
  description = "The reader endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
} 