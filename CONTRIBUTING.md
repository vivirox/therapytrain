# Contributing to Gradiant

Thank you for your interest in contributing to Gradiant! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [info@gemcity.xyz](mailto:info@gemcity.xyz).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/gradiant.git`
3. Add the upstream remote: `git remote add upstream https://github.com/gradiantascent/gradiant.git`
4. Create a new branch for your changes: `git checkout -b feature/your-feature-name`

## Development Environment

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values in `.env.local`

3. Set up Python environment:

   ```bash
   conda env create -f environment.yml
   conda activate gradiant
   pip install -r requirements.txt
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## Making Changes

1. Write clean, maintainable, and tested code
2. Follow the existing code style and patterns
3. Keep commits atomic and write meaningful commit messages
4. Update documentation as needed
5. Add tests for new functionality

## Testing

1. Run the test suite:

   ```bash
   pnpm test           # Unit tests
   pnpm test:e2e      # E2E tests
   pnpm test:coverage # Coverage report
   ```

2. Ensure all tests pass before submitting a PR
3. Add new tests for new functionality
4. Update existing tests as needed

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation if you're changing functionality
3. Ensure your PR includes:
   - Clear description of changes
   - Any relevant issue numbers
   - Screenshots for UI changes
   - Test coverage for new code
4. The PR will be merged once you have the sign-off of at least one maintainer

## Style Guide

### TypeScript

- Use TypeScript for all new code
- Follow the existing type definitions
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Use proper type annotations

### React

- Use functional components
- Use hooks for state and side effects
- Follow the component file structure
- Use proper prop types
- Implement proper error boundaries

### CSS/Tailwind

- Use Tailwind CSS for styling
- Follow the existing theme system
- Use semantic class names
- Ensure responsive design
- Follow accessibility guidelines

### Testing

- Write unit tests for utilities and hooks
- Write integration tests for components
- Write E2E tests for critical user flows
- Use proper test descriptions
- Follow the AAA pattern (Arrange, Act, Assert)

### Git Commit Messages

- Use the conventional commits format
- Include the scope of changes
- Be descriptive but concise
- Reference issues when applicable

## Security

- Never commit sensitive information
- Use environment variables for secrets
- Follow security best practices
- Report security issues privately
- Keep dependencies up to date

## Questions?

If you have questions, please:

1. Check the documentation
2. Search for existing issues
3. Ask in the community Discord
4. Create a new issue

Thank you for contributing to Gradiant!
