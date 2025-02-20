#!/bin/bash

# Script to set up GitHub secrets
# Usage: ./setup-secrets.sh <github_token> <repo_name>

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <github_token> <repo_name>"
    echo "Example: $0 ghp_xxxx username/therapytrain"
    exit 1
fi

GITHUB_TOKEN=$1
REPO_NAME=$2

# Function to create a secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    # Get public key for secret encryption
    local key_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_NAME/actions/secrets/public-key")
    
    local key_id=$(echo $key_response | jq -r .key_id)
    local public_key=$(echo $key_response | jq -r .key)
    
    # Encrypt secret value
    local encrypted_value=$(echo -n "$secret_value" | openssl base64 -A)
    
    # Create secret
    curl -X PUT \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_NAME/actions/secrets/$secret_name" \
        -d "{
            \"encrypted_value\": \"$encrypted_value\",
            \"key_id\": \"$key_id\"
        }"
}

# Read secrets from .env file if it exists
if [ -f ".env" ]; then
    echo "Loading secrets from .env file..."
    source .env
fi

# Prompt for missing secrets
if [ -z "$VERCEL_TOKEN" ]; then
    read -p "Enter Vercel API token: " VERCEL_TOKEN
fi

if [ -z "$VERCEL_ORG_ID" ]; then
    read -p "Enter Vercel organization ID: " VERCEL_ORG_ID
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
    read -p "Enter Vercel project ID: " VERCEL_PROJECT_ID
fi

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    read -p "Enter Slack webhook URL: " SLACK_WEBHOOK_URL
fi

# Create secrets
echo "Creating GitHub secrets..."

create_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
create_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
create_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID"
create_secret "SLACK_WEBHOOK_URL" "$SLACK_WEBHOOK_URL"

echo "Secrets setup complete"

# Create environment secrets
echo "Creating environment-specific secrets..."

# Staging environment secrets
for secret_name in "VERCEL_TOKEN" "VERCEL_ORG_ID" "VERCEL_PROJECT_ID"; do
    curl -X PUT \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_NAME/environments/staging/secrets/$secret_name" \
        -d "{
            \"encrypted_value\": \"${!secret_name}\",
            \"key_id\": \"$key_id\"
        }"
done

# Production environment secrets
for secret_name in "VERCEL_TOKEN" "VERCEL_ORG_ID" "VERCEL_PROJECT_ID"; do
    curl -X PUT \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO_NAME/environments/production/secrets/$secret_name" \
        -d "{
            \"encrypted_value\": \"${!secret_name}\",
            \"key_id\": \"$key_id\"
        }"
done

echo "Environment secrets setup complete" 