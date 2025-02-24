#!/bin/bash

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "Please provide your GitHub token as the first argument"
    exit 1
fi

# Check if repository name is provided
if [ -z "$2" ]; then
    echo "Please provide your repository name (format: username/repository) as the second argument"
    exit 1
fi

GITHUB_TOKEN=$1
REPO_NAME=$2

# Export token for gh CLI
export GITHUB_TOKEN

# Test GitHub access
echo "Testing GitHub token..."
if ! gh auth status 2>/dev/null; then
    echo "Error: GitHub token is invalid or doesn't have required permissions"
    exit 1
fi

echo "Using repository: $REPO_NAME"
echo "Waiting 5 seconds before creating environments..."
sleep 5

# Function to create environment
create_environment() {
    local env_name=$1
    echo "Creating environment: $env_name"
    echo "Using API endpoint: /repos/$REPO_NAME/environments/$env_name"
    
    # Create environment using gh api
    response=$(gh api \
      --method PUT \
      "/repos/$REPO_NAME/environments/$env_name" \
      -f wait_timer=0 \
      -f reviewers='[]' \
      -f deployment_branch_policy='{
          "protected_branches": true,
          "custom_branch_policies": false
      }' \
      -f required_status_checks='[]' \
      -f required_pull_request_reviews='{
          "bypass_pull_request_allowances": {
              "users": [],
              "teams": []
          }
      }' 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "Successfully created environment: $env_name"
        echo "Response: $response"
    else
        echo "Failed to create environment: $env_name"
        echo "Error: $response"
        return 1
    fi
}

# Create staging environment
if create_environment "staging"; then
    echo "Staging environment created successfully"
else
    echo "Failed to create staging environment"
    exit 1
fi

# Create production environment
if create_environment "production"; then
    echo "Production environment created successfully"
else
    echo "Failed to create production environment"
    exit 1
fi

echo "Environment setup completed successfully!" 