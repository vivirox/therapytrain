#!/bin/bash

# Update a single pnpm dependency
# Usage: update_dependency <package_name>

update_dependency() {
  package_name="$1"

  echo "Updating ${package_name}..."
  pnpm update "${package_name}@latest"
  echo "Updated ${package_name}. Please test thoroughly!"
}

# Example usage:
# update_dependency "react"