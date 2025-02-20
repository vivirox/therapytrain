#!/bin/bash

# Rollback script for TherapyTrain application
# Usage: ./rollback.sh <environment> <version>

set -e

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <environment> <version>"
    echo "Example: $0 production v1.2.3"
    exit 1
fi

ENVIRONMENT=$1
VERSION=$2
VERCEL_TOKEN=${VERCEL_TOKEN:-""}
VERCEL_ORG_ID=${VERCEL_ORG_ID:-""}
VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID:-""}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|production)$ ]]; then
    echo "Error: Environment must be either 'development' or 'production'"
    exit 1
fi

# Check required environment variables
if [ -z "$VERCEL_TOKEN" ] || [ -z "$VERCEL_ORG_ID" ] || [ -z "$VERCEL_PROJECT_ID" ]; then
    echo "Error: Missing required environment variables"
    echo "Please set VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID"
    exit 1
fi

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

echo "Starting rollback to version $VERSION in $ENVIRONMENT environment..."

# Get current deployment
CURRENT_DEPLOYMENT=$(vercel list "$VERCEL_PROJECT_ID" --token "$VERCEL_TOKEN" | grep "$ENVIRONMENT" | head -n 1 | awk '{print $1}')

if [ -z "$CURRENT_DEPLOYMENT" ]; then
    echo "Error: Could not find current deployment"
    exit 1
fi

echo "Current deployment: $CURRENT_DEPLOYMENT"

# Find target deployment
TARGET_DEPLOYMENT=$(vercel list "$VERCEL_PROJECT_ID" --token "$VERCEL_TOKEN" | grep "$VERSION" | head -n 1 | awk '{print $1}')

if [ -z "$TARGET_DEPLOYMENT" ]; then
    echo "Error: Could not find deployment for version $VERSION"
    exit 1
fi

echo "Target deployment: $TARGET_DEPLOYMENT"

# Perform rollback
echo "Rolling back to version $VERSION..."

# Store current deployment URL for health check
CURRENT_URL=$(vercel inspect "$CURRENT_DEPLOYMENT" --token "$VERCEL_TOKEN" | grep "URL:" | awk '{print $2}')

# Perform the rollback
if vercel rollback "$TARGET_DEPLOYMENT" --token "$VERCEL_TOKEN"; then
    echo "Rollback initiated successfully"
    
    # Wait for rollback to complete
    echo "Waiting for rollback to complete..."
    sleep 30

    # Verify the rollback
    NEW_URL=$(vercel inspect "$TARGET_DEPLOYMENT" --token "$VERCEL_TOKEN" | grep "URL:" | awk '{print $2}')
    
    # Health check
    if curl -s -f "$NEW_URL/health" > /dev/null; then
        echo "Rollback completed successfully"
        send_notification "success" "✅ Rollback to $VERSION completed successfully in $ENVIRONMENT"
    else
        echo "Error: Health check failed after rollback"
        
        # Attempt to roll forward
        echo "Rolling forward to previous version..."
        if vercel rollback "$CURRENT_DEPLOYMENT" --token "$VERCEL_TOKEN"; then
            echo "Roll forward completed"
            send_notification "warning" "⚠️ Rollback failed, rolled forward to previous version in $ENVIRONMENT"
        else
            echo "Error: Roll forward failed"
            send_notification "error" "🚨 Critical: Both rollback and roll forward failed in $ENVIRONMENT"
            exit 1
        fi
    fi
else
    echo "Error: Rollback failed"
    send_notification "error" "❌ Rollback to $VERSION failed in $ENVIRONMENT"
    exit 1
fi

# Update deployment aliases if in production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Updating production aliases..."
    vercel alias set "$TARGET_DEPLOYMENT" "therapytrain.com" --token "$VERCEL_TOKEN"
    vercel alias set "$TARGET_DEPLOYMENT" "www.therapytrain.com" --token "$VERCEL_TOKEN"
fi

echo "Rollback process completed" 