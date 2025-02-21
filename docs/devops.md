# DevOps Documentation

## Overview

This document describes the DevOps setup for Gradiant, including CI/CD pipelines, infrastructure management, monitoring, and deployment procedures.

## CI/CD Pipeline

Our CI/CD pipeline is implemented using GitHub Actions and consists of the following stages:

1. **Security Scan**
   - Runs Trivy vulnerability scanner
   - Checks for security issues in dependencies
   - Uploads results to GitHub Security tab

2. **Build and Test**
   - Installs dependencies
   - Runs test suite
   - Builds application
   - Creates Docker image
   - Pushes to GitHub Container Registry

3. **Deployment**
   - Staging deployment for verification
   - Production deployment after approval
   - Automatic rollback on failure
   - Slack notifications for deployment status

## Infrastructure as Code

Infrastructure is managed using Terraform with the following components:

1. **Vercel Configuration**
   - Project settings
   - Environment variables
   - Domain configuration

2. **GitHub Configuration**
   - Repository settings
   - Branch protection rules
   - Action secrets

3. **Monitoring Stack**
   - Prometheus for metrics collection
   - Grafana for visualization
   - Custom dashboards for application metrics

## Monitoring and Observability

### Metrics Collection
- Request rates and latencies
- Error rates
- Resource utilization
- Custom business metrics

### Dashboards
- Application performance
- System health
- Business metrics
- Error tracking

### Alerting
- Slack notifications
- Error rate thresholds
- Performance degradation alerts
- Custom alert rules

## Deployment Procedures

### Standard Deployment
1. Push to main branch
2. Automatic deployment to staging
3. Verification and testing
4. Manual approval for production
5. Deployment to production

### Rollback Procedure
1. Run rollback script:
   ```bash
   ./scripts/rollback.sh <environment> <version>
   ```
2. Script performs:
   - Health check verification
   - Automatic rollback on failure
   - DNS updates if needed
   - Notification of status

## Required Secrets

The following secrets need to be configured in GitHub:

1. `VERCEL_TOKEN`: Vercel API token
2. `VERCEL_ORG_ID`: Vercel organization ID
3. `VERCEL_PROJECT_ID`: Vercel project ID
4. `SLACK_WEBHOOK_URL`: Slack webhook for notifications

## Local Development

### Prerequisites
- Node.js 20+
- pnpm
- Docker and Docker Compose
- Vercel CLI

### Setup
1. Clone repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start local services:
   ```bash
   docker-compose up -d
   ```
4. Run development server:
   ```bash
   pnpm dev
   ```

### Testing
- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Integration tests: `pnpm test:integration`

## Terraform Management

### Initialize
```bash
cd terraform
terraform init
```

### Plan Changes
```bash
terraform plan -var-file=environments/development.tfvars
```

### Apply Changes
```bash
terraform apply -var-file=environments/development.tfvars
```

### Destroy Infrastructure
```bash
terraform destroy -var-file=environments/development.tfvars
```

## Monitoring Access

### Grafana
- URL: http://localhost:3001
- Default credentials:
  - Username: admin
  - Password: admin

### Prometheus
- URL: http://localhost:9090

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check deployment logs in Vercel
   - Verify GitHub Actions logs
   - Check application logs
   - Run health checks

2. **Monitoring Issues**
   - Verify Prometheus targets
   - Check metric collection
   - Validate alert rules
   - Check Grafana datasources

3. **Infrastructure Issues**
   - Review Terraform state
   - Check provider status
   - Verify credentials
   - Review error logs

### Support

For additional support:
1. Check error logs
2. Review documentation
3. Contact DevOps team
4. Create GitHub issue 