#!/bin/bash

# Load environment variables
set -a
source .env
set +a

# Run migrations if needed
echo "Running database migrations..."
pnpm supabase db push

# Run the analysis scripts
echo "Running database performance analysis..."
pnpm tsx src/scripts/analyze-db-performance.ts

echo "Running index optimization..."
pnpm tsx src/scripts/optimize-indexes.ts 