#!/bin/bash

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first:"
    echo "brew install gh"
    exit 1
fi

# Check if logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "Please login to GitHub CLI first:"
    echo "gh auth login"
    exit 1
fi

# Get the repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Create staging environment
echo "Creating staging environment..."
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/environments/staging" \
  -f wait_timer=0 \
  -f reviewers=[] \
  -f deployment_branch_policy=null

# Create production environment with protection rules
echo "Creating production environment..."
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/environments/production" \
  -f wait_timer=30 \
  -f reviewers=[] \
  -f deployment_branch_policy={"protected_branches":true,"custom_branch_policies":false}

echo "Environments created successfully!"
echo "Please add the following secrets to both environments:"
echo "- VERCEL_TOKEN"
echo "- VERCEL_ORG_ID"
echo "- VERCEL_PROJECT_ID"
echo "- SLACK_WEBHOOK_URL" 