#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [[ ! "$NODE_VERSION" =~ ^22\. ]]; then
        print_error "Node.js version 22.x is required"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed"
        print_status "Installing pnpm..."
        npm install -g pnpm
    fi
    
    # Check conda
    if ! command -v conda &> /dev/null; then
        print_error "conda is not installed"
        exit 1
    fi
}

# Setup conda environment
setup_conda() {
    print_status "Setting up conda environment..."
    
    # Create or update conda environment
    if conda env list | grep -q "^gradiant "; then
        print_status "Updating existing conda environment..."
        conda env update -f environment.yml
    else
        print_status "Creating new conda environment..."
        conda env create -f environment.yml
    fi
    
    # Activate environment
    print_status "Activating conda environment..."
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate gradiant
}

# Setup Node.js environment
setup_node() {
    print_status "Setting up Node.js environment..."
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    pnpm install
    
    # Setup git hooks
    print_status "Setting up git hooks..."
    if [ -d ".git" ]; then
        if [ -f ".husky/pre-commit" ]; then
            chmod +x .husky/pre-commit
        fi
        if [ -f ".husky/pre-push" ]; then
            chmod +x .husky/pre-push
        fi
    fi
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_warning "Created .env.local from .env.example. Please update with your values."
        else
            print_error ".env.example not found"
            exit 1
        fi
    fi
    
    if [ ! -f ".env.test" ]; then
        touch .env.test
        print_warning "Created empty .env.test file. Please configure test environment variables."
    fi
}

# Setup development tools
setup_tools() {
    print_status "Setting up development tools..."
    
    # Download face and mediapipe models
    print_status "Downloading ML models..."
    pnpm download:models
    
    # Setup Playwright
    print_status "Setting up Playwright..."
    pnpm exec playwright install
}

# Main setup
main() {
    print_status "Starting development environment setup..."
    
    check_requirements
    setup_conda
    setup_node
    setup_env
    setup_tools
    
    print_status "Development environment setup complete!"
    print_status "To start development server:"
    echo "    1. Activate conda environment: conda activate gradiant"
    echo "    2. Start dev server: pnpm dev"
    print_warning "Make sure to update .env.local with your configuration values"
}

# Run main setup
main 