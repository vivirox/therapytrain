#!/bin/bash

# Exit on any error
set -e

# Check if MP-SPDZ binary directory is set
if [ -z "$MP_SPDZ_BINARY_DIR" ]; then
  echo "Error: MP_SPDZ_BINARY_DIR environment variable not set"
  echo "Please set it to the directory containing MP-SPDZ binaries"
  exit 1
fi

# Check if required binaries exist
required_binaries=("mascot-party.x" "spdz2k-party.x" "semi2k-party.x")
for binary in "${required_binaries[@]}"; do
  if [ ! -f "$MP_SPDZ_BINARY_DIR/$binary" ]; then
    echo "Error: Required binary $binary not found in $MP_SPDZ_BINARY_DIR"
    exit 1
  fi
done

# Create preprocessing directory if it doesn't exist
PREPROCESSING_DIR="__tests__/preprocessing"
mkdir -p "$PREPROCESSING_DIR"

# Clean up any existing preprocessing data
rm -rf "$PREPROCESSING_DIR"/*

# Run performance profiling
echo "Running performance profiling..."
NODE_OPTIONS="--max-old-space-size=4096" ts-node \
  --project tsconfig.json \
  --transpile-only \
  scripts/performance-profile.ts | tee performance-report.txt

# Clean up preprocessing data
echo "Cleaning up..."
rm -rf "$PREPROCESSING_DIR"

echo "Performance profiling completed! Results saved to performance-report.txt" 