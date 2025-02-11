# TherapyTrain Integrations

This directory contains the integration code for incorporating features from Liftoff (AI Mock Interview Platform) and PocketBase into TherapyTrain.

## Directory Structure

```
integrations/
├── liftoff/
│   ├── components/  # UI components from Liftoff
│   ├── hooks/       # React hooks and business logic
│   └── utils/       # Utility functions and helpers
├── pocket/
│   ├── components/  # PocketBase-specific components
│   ├── hooks/       # Data management hooks
│   └── utils/       # Database and API utilities
└── README.md       # This file
```

## Integration Strategy

### Liftoff Integration

The Liftoff integration focuses on incorporating the UI/UX elements and chat interface components while maintaining our core Supabase infrastructure. Key components include:

1. Chat Interface
   - Message containers and bubbles
   - Typing indicators
   - Message status indicators
   - Emoji support

2. Navigation Elements
   - Sidebar navigation
   - Header components
   - Breadcrumb navigation
   - Mobile-responsive menu

3. Form Components
   - Input fields with validation
   - Textarea components
   - Select dropdowns
   - Custom radio/checkbox components

### PocketBase Integration

The PocketBase integration focuses on adopting its backend architecture patterns and data management strategies while maintaining our Zero-Knowledge infrastructure. Key features include:

1. Authentication System
   - User management patterns
   - Role-based access control
   - Session handling
   - Security audit system

2. Data Management
   - Schema organization
   - Data validation patterns
   - API layer architecture
   - Real-time subscription patterns

## Development Guidelines

1. Component Integration
   - Maintain consistent naming conventions
   - Document component props and usage
   - Include accessibility features
   - Add proper TypeScript types

2. State Management
   - Use React hooks for local state
   - Implement proper error handling
   - Add loading states
   - Handle edge cases

3. Testing
   - Write unit tests for components
   - Add integration tests
   - Include accessibility tests
   - Test error scenarios

4. Documentation
   - Document component usage
   - Add code comments
   - Include examples
   - Maintain changelog

## Getting Started

1. Clone the repository with submodules:
   ```bash
   git clone --recursive [repository-url]
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

## Contributing

1. Create a feature branch:
   ```bash
   git checkout -b feat/[feature-name]
   ```

2. Make your changes and commit:
   ```bash
   git commit -m "[Cursor] feat: Description of changes"
   ```

3. Push your changes and create a pull request:
   ```bash
   git push origin feat/[feature-name]
   ```

## Progress Tracking

See the [Integration Roadmap](/docs/integration-roadmap.mdx) for detailed progress tracking and milestones.
