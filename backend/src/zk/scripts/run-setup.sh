#!/bin/bash

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "../../node_modules" ]; then
    echo "Installing dependencies..."
    cd ../..
    bun install
    cd - > /dev/null
fi

# Run the setup script
echo "Running ZK setup..."
bun run setup.ts

# Check if setup was successful
if [ $? -eq 0 ]; then
    echo "ZK setup completed successfully!"
else
    echo "Error during ZK setup"
    exit 1
fi
