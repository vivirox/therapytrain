#!/bin/bash

# Script to set up monitoring infrastructure
# Usage: ./setup-monitoring.sh

set -e

# Create necessary directories
mkdir -p config/prometheus
mkdir -p config/grafana/dashboards
mkdir -p config/grafana/provisioning/datasources
mkdir -p config/grafana/provisioning/dashboards

# Create Prometheus config
cat > config/prometheus/prometheus.yml << EOL
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gradiant'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # alertmanager:9093

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"
EOL

# Create Grafana datasource config
cat > config/grafana/provisioning/datasources/datasource.yml << EOL
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOL

# Create Grafana dashboard provisioning config
cat > config/grafana/provisioning/dashboards/dashboards.yml << EOL
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
EOL

# Copy dashboard JSON files
cp config/grafana/dashboards/app-metrics.json config/grafana/dashboards/

# Create docker-compose override for monitoring
cat > docker-compose.monitoring.yml << EOL
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:9090/-/healthy"]
      interval: 10s
      timeout: 5s
      retries: 3

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - ./config/grafana/provisioning:/etc/grafana/provisioning
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    depends_on:
      prometheus:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
EOL

# Start monitoring services
echo "Starting monitoring services..."
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d prometheus grafana

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Check service health
echo "Checking service health..."
curl -s http://localhost:9090/-/healthy || echo "Prometheus is not healthy"
curl -s http://localhost:3001/api/health || echo "Grafana is not healthy"

echo "Monitoring setup complete!"
echo "Grafana UI: http://localhost:3001 (admin/admin)"
echo "Prometheus UI: http://localhost:9090" 