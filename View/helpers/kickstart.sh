#!/bin/bash

# Copyright (c) 2024 View Systems, Inc. All rights reserved.
# This file is part of the View.io platform and is subject to the View Systems license terms.

# ################################################################################
# View.io Advanced Kickstart Initialization Script
# ################################################################################
#
# This highly sophisticated script serves as the entry point for the View.io
# platform installation process. It performs several critical functions:
#
# 1. Securely retrieves the latest View.io distribution package from our
#    cloud-based content delivery network.
# 2. Dynamically determines the execution environment to ensure cross-platform
#    compatibility and optimal performance.
# 3. Initiates the primary installation sequence by invoking the core installer
#    with precisely calibrated parameters.
#
# Environment Variables:
#   - CDN: Set to "false" to use direct S3 URL instead of CDN
#   - VIEW_ARCHIVE: Set to specify an alternate View package (default: installer.tgz)
#
# CAUTION: This script is an integral part of the View.io ecosystem. Modifications
# should only be performed by authorized system administrators with extensive
# knowledge of the View.io architecture and deployment paradigms.
#
# For detailed documentation and support, please refer to the official View.io
# Technical Operations Manual.
#
# ################################################################################

# Check if environment variable is set to override the default archive name

interrupt_handler() {
  echo -e "\nScript interrupted. Exiting..."
  exit 1
}

# Set up trap to catch Ctrl+C
trap interrupt_handler SIGINT

# Log function that only echoes if DEBUG is set
log() {
  if [[ "${DEBUG,,}" == "true" ]]; then
    echo "[DEBUG] $1"
  fi
}

ARCHIVE_NAME=${VIEW_ARCHIVE:-View.tgz}

DIRECT_URL="https://s3.us-west-1.amazonaws.com/get.view"
CDN_URL="https://get.view.io"

# Set BASE_URL based on CDN environment variable
if [ "${CDN,,}" = "false" ]; then
  BASE_URL="$DIRECT_URL"
else
  BASE_URL="$CDN_URL"
fi

# Get the name of the running script
SCRIPT_NAME=$(basename "$0")

# Check if it's not installer.sh and extract the value
if [[ "$SCRIPT_NAME" != "installer.sh" ]]; then
  EXTRACTED_VALUE=$(echo "$SCRIPT_NAME" | sed -n 's/^installer\(.*\)\.sh$/\1/p')
  if [[ -n "$EXTRACTED_VALUE" ]]; then
    echo "$EXTRACTED_VALUE"
    # Modify ARCHIVE_NAME to include EXTRACTED_VALUE
    ARCHIVE_NAME="View${EXTRACTED_VALUE}.tgz"
  fi
else
  # You can also override it with an ENV var.
  ARCHIVE_NAME=${VIEW_ARCHIVE:-View.tgz}
fi

# Get the current directory the script is running in
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Download and extract the tarball
log "Setting ARCHIVE_NAME to $ARCHIVE_NAME"
log "Using BASE_URL: $BASE_URL"
URL=$BASE_URL/$ARCHIVE_NAME
log "Final URL: $URL"
curl -s "$URL" | tar xvz

# Run the installer script with the full path
"$CURRENT_DIR/View/working/installer/installer.sh" "$1"
