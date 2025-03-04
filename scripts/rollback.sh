#!/bin/bash

set -euo pipefail

# Environment variables
ENVIRONMENT=${ENVIRONMENT:-"production"}
VERSION=${VERSION:-""}
REGISTRY=${REGISTRY:-"ghcr.io"}
IMAGE_NAME=${IMAGE_NAME:-"your-org/your-app"}

# Check required variables
if [[ -z "${VERSION}" ]]; then
  echo "Please provide VERSION to rollback to"
  exit 1
fi

# Get current deployment
echo "Getting current deployment..."
CURRENT_DEPLOYMENT=$(kubectl get deployment -n "${ENVIRONMENT}" -o jsonpath='{.items[0].metadata.name}')

# Get target deployment image
TARGET_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "Rolling back to version ${VERSION}..."
if kubectl set image deployment/"${CURRENT_DEPLOYMENT}" "${CURRENT_DEPLOYMENT}=${TARGET_IMAGE}" -n "${ENVIRONMENT}"; then
  echo "✅ Rollback initiated successfully"

  # Wait for rollout to complete
  if kubectl rollout status deployment/"${CURRENT_DEPLOYMENT}" -n "${ENVIRONMENT}"; then
    echo "✅ Rollback completed successfully"
    exit 0
  else
    echo "❌ Rollback failed to complete"
    exit 1
  fi
else
  echo "❌ Failed to initiate rollback"
  exit 1
fi