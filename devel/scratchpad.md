# Lessons

- For website image paths, always use the correct relative path (e.g., 'images/filename.png') and ensure the images directory exists
- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- When using Jest, a test suite can fail even if all individual tests pass, typically due to issues in suite-level setup code or lifecycle hooks
- When using snarkjs.zKey.exportSolidityVerifier, it requires two arguments: the zkey file path and an options object with the template path. The template path should be specified in the format { groth16: 'path/to/template.sol' }
- When using circom circuits, array inputs must match the exact size specified in the circuit. For example, if a circuit expects a 256-bit public key as input signal therapistPubKey[256], you must provide an array of exactly 256 bits.
- When working with EdDSA signatures in circom, you need to provide the signature components (R8 point and S) as arrays of bits, not as private keys. For example, therapistSigR8[256] and therapistSigS[256] for a 256-bit EdDSA signature.
- When working with snarkjs verification, the verification key (vKey) needs to be loaded from the saved JSON file before verification, even if it was generated earlier in the same script. Variables defined in try-catch blocks have block scope, so they need to be reloaded when used in a different scope
- In SecurityAuditService, the method for recording alerts is called `recordAlert` (not `logAlert`) and takes three parameters: alertType, severity, and details
- When using circomlibjs in TypeScript projects, you need to install @types/circomlibjs for proper type support: `npm install --save-dev @types/circomlibjs --legacy-peer-deps`
- When using external JavaScript/TypeScript modules without type definitions, create a custom .d.ts file in src/types and add the directory to typeRoots in tsconfig.json
- When using external libraries in TypeScript that don't have type definitions, create a custom declaration file (.d.ts) in src/types and add the directory to typeRoots in tsconfig.json
- When using circomlib's EdDSA implementation with TypeScript, either create proper type definitions or use type assertions (as any) for methods like pubKey2Bits, r8Bits, and sBits
- When using Jest with TypeScript and NestJS, ensure all mocked services have their corresponding service files created, even if they're just mocked in tests. The TypeScript compiler needs the actual service files to exist for type checking
- When mocking services in TypeScript tests, ensure all methods being called in the test exist in the actual service class implementation. Added logAccessPattern method to SecurityAuditService to fix TypeScript error.
- When installing npm packages that don't include built-in TypeScript types, install their corresponding @types/* package (e.g., @types/mime for the mime package) using --legacy-peer-deps if there are dependency conflicts
- In RateLimiterService, the suspicious list functionality is implemented with three methods: addToSuspiciousList, isInSuspiciousList, and removeFromSuspiciousList. These methods work together to track and manage potentially malicious IPs or user IDs.
- When implementing test mocks, ensure that all mocked methods actually exist in the service being mocked. If a method is missing, either add it to the service or update the test to use existing methods.
- Added `decreaseLimit` method to RateLimiterService to handle rate limit reduction for suspicious IPs, with a default behavior of halving the current limit.
- Use Bun instead of npm/yarn for package management and TypeScript type definitions installation (e.g., `bun add -d @types/package-name`)
- Express middleware and route handlers must return void or Promisevoid
- Express route handlers should use next(error) instead of returning responses directly when using async/await
- Supabase auth middleware needs proper type definitions for the user object
- When using Supabase auth, import User type from '@supabase/supabase-js' for proper type checking
- Always add return type annotations to async functions in TypeScript for better type inference
- In Express error handlers, avoid returning the response object as it causes type conflicts
- When using Express with TypeScript, properly extend the Request interface for custom properties
- Use Supabase for all database operations since it's our primary database solution
- Avoid mixing different database solutions unless there's a specific requirement

## Scratchpad

## Current Task: Alpha Release Review

Our goal is to prepare the project for an alpha release, with special focus on chat functions, AI flow, and routing. Here's our review plan:

[X] Initial Project Structure Review

- Found critical missing components:
    1. No dedicated chat service implementation
    2. Missing WebSocket setup for real-time communication
    3. Incomplete route structure in backend
    4. Limited frontend implementation
    5. No clear AI flow service implementation

[X] Implement WebSocket Chat Infrastructure

- [X] Created ChatService with:
  - Real-time message handling
  - Client connection management
  - Heartbeat mechanism
  - Security audit integration
  - Rate limiting
- [X] Added chat routes for:
  - Chat history
  - Active participants
  - Message reporting
- [X] Updated app.ts with WebSocket server

[X] Implement AI Flow Integration

- [X] Created AIService with:
  - Message processing pipeline
  - Crisis detection and handling
  - Sentiment analysis support
  - Topic extraction
  - Follow-up question generation
  - Retry mechanism with error handling
- [X] Integrated AIService with ChatService:
  - Real-time AI responses
  - Crisis alerts
  - Error handling
  - Metadata processing

[X] Implement Frontend Chat Components

- [X] Created ChatInterface component:
  - Real-time message display
  - User presence indicators
  - Message input handling
  - AI response formatting
  - Follow-up questions UI
  - Topic tags display
- [X] Created WebSocket hook:
  - Secure connection handling
  - Automatic reconnection
  - Connection status tracking
  - Message queuing
  - Heartbeat mechanism

[X] Implement Message Persistence

- [X] Created Supabase configuration file with message and session types
- [X] Implemented MessageService for handling message and session persistence
- [X] Updated ChatService to use MessageService for all message operations
- [X] Added session management with metadata tracking
- [X] Implemented message history retrieval

[X] Add Comprehensive Testing

- [X] Created test suite for MessageService
- [X] Created test suite for ChatService
- [X] Added tests for message persistence
- [X] Added tests for session management
- [X] Added tests for error handling and crisis detection

[X] User Session Management Implementation

- Implement user authentication system with Supabase
- Add user profile management
- Add session recovery for disconnected users

[X] Documentation

- API Documentation
  - [X] Document all REST endpoints with request/response examples
  - [X] Document WebSocket events and message formats
  - [X] Document authentication flows and requirements
  - [X] Document rate limiting and security measures

- Deployment Documentation
  - [X] System requirements and prerequisites
  - [X] Environment setup instructions
  - [X] Configuration options and environment variables
  - [X] Deployment procedures for different environments

- Database Documentation
  - [X] Complete schema documentation with relationships
  - [X] Data models and types
  - [X] Migration procedures
  - [X] Backup and recovery procedures

### Current Focus: Chat Implementation

#### Learnings from Supa-Chat Implementation

1. Database Structure
   - Simple but effective chat storage using a JSON payload column
   - Clean separation of concerns between chat data and user data
   - Efficient querying using JSON operators

2. Real-time Features
   - Uses Vercel's AI SDK for streaming responses
   - Client-side message handling with optimistic updates
   - Clean component structure for chat UI

3. Architecture Improvements
   - Move from WebSocket to Server-Sent Events for simpler implementation
   - Use Supabase Realtime for live updates
   - Adopt the payload-based storage pattern for flexibility

#### Implementation Plan

1. Database Updates
   [ ] Modify sessions table to include JSON payload
   [ ] Add messages table with JSON payload
   [ ] Set up Supabase RLS policies
   [ ] Add indexes for efficient querying

2. Backend Changes
   [ ] Replace WebSocket with SSE endpoint
   [ ] Implement message streaming
   [ ] Add Supabase Realtime subscriptions
   [ ] Update session management

3. Frontend Implementation
   [ ] Create chat components (list, message, input)
   [ ] Add real-time message updates
   [ ] Implement optimistic updates
   [ ] Add error handling and recovery

#### Database Schema Updates

```sql
create table public.sessions (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users not null,
    payload jsonb default '{}'::jsonb,
    status text default 'active'::text,
    -- Add RLS policies here
);

create table public.messages (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    session_id uuid references public.sessions not null,
    user_id uuid references auth.users not null,
    payload jsonb default '{}'::jsonb,
    -- Add RLS policies here
);

-- Indexes
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_status on public.sessions(status);
create index idx_messages_session_id on public.messages(session_id);
create index idx_messages_payload on public.messages using gin (payload);
```

#### Next Steps

1. Update database schema
2. Implement SSE endpoint
3. Create basic chat components
4. Add real-time subscriptions

Would you like me to proceed with implementing these changes? I recommend starting with the database schema updates since that will form the foundation for the rest of the changes.

### Recent Changes

#### User Authentication and Session Management

- Implemented UserService with Supabase integration:
  - User profile management (create, update, get)
  - Session management (create, revoke, list)
  - Account security (temporary locks, resource access)
  - Activity tracking and audit logging

- Added user routes for:
  - Profile management (/api/user/profile)
  - Session management (/api/user/sessions)
  - Preference management (/api/user/preferences)

- Added comprehensive types:
  - UserProfile for user data
  - UserSession for session tracking
  - Added proper error handling and audit logging

#### Next Implementation Tasks

[X] User Session Recovery

- Implement session recovery for disconnected users

[ ] System Review and Testing

- End-to-end testing of chat functionality
- Load testing of WebSocket connections
- Security audit of authentication flow
- Performance testing of rate limiting
- Integration testing of AI response handling
- Crisis detection verification

[ ] Alpha Release Preparation

- Review and update all documentation
- Deployment configuration
- Environment setup guide
- Security measures documentation
- API documentation
- Database schema documentation

### Progress Update

### Completed Tasks

[X] Implement Message Persistence

- Created Supabase configuration file with message and session types
- Implemented MessageService for handling message and session persistence
- Updated ChatService to use MessageService for all message operations
- Added session management with metadata tracking
- Implemented message history retrieval

[X] Add Comprehensive Testing

- Created test suite for MessageService
- Created test suite for ChatService
- Added tests for message persistence
- Added tests for session management
- Added tests for error handling and crisis detection

[X] User Session Management Implementation

- Implement user authentication system with Supabase
- Add user profile management
- Add session recovery for disconnected users

### Next Steps to Do

[ ] System Review and Testing

- End-to-end testing of chat functionality
- Load testing of WebSocket connections
- Security audit of authentication flow
- Performance testing of rate limiting
- Integration testing of AI response handling
- Crisis detection verification

[ ] Alpha Release Preparation

- Review and update all documentation
- Deployment configuration
- Environment setup guide
- Security measures documentation
- API documentation
- Database schema documentation

#### UI Components Implementation

#### Core Components Implemented

[X] Button component with variants
[X] Textarea for message input
[X] Avatar for user and AI
[X] Dialog for modals
[X] Dropdown menu for actions
[X] Toast notifications
[X] Utility functions
[X] Form components (Input, Select, Switch)
[X] Loading skeletons and indicators
[X] Dark mode support
[X] Animations and transitions
[X] Form validation with Zod
[X] Error boundaries and error handling
[X] Keyboard navigation and focus management
[X] Automated testing
[X] Performance optimizations

#### Testing Implementation

1. Test Setup
   - Jest DOM setup
   - Test utilities
   - Mock implementations
   - Custom render function

2. Component Tests
   - Button component tests
   - Form hook tests
   - Accessibility tests
   - Event handling tests

3. Test Coverage
   - Unit tests
   - Integration tests
   - Snapshot tests
   - Accessibility tests

#### Performance Optimizations

1. List Virtualization
   - Virtual scrolling for long lists
   - Dynamic height calculation
   - Smooth scrolling
   - Resize handling

2. Debouncing & Throttling
   - Input debouncing
   - Scroll event throttling
   - Window resize handling
   - API call optimization

3. Infinite Scrolling
   - Efficient data loading
   - Intersection observer
   - Loading states
   - Error handling

#### Dependencies Added

```json
{
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/react": "^14.1.2",
  "@testing-library/user-event": "^14.5.1",
  "vitest": "^1.0.4"
}
```

#### Next Steps Left

[X] Add form validation
[X] Implement error boundaries
[X] Add keyboard navigation support
[X] Add automated testing
[X] Improve performance optimization
[ ] Create component documentation
[ ] Add E2E testing
[ ] Implement CI/CD pipeline

#### Message Persistencer

- Messages are stored in Supabase with metadata including:
  - Message type (user, AI, status, error)
  - Sentiment analysis results
  - Topic tags
  - Follow-up questions
- Sessions track:
  - User activity
  - Conversation topics
  - Overall sentiment
  - Crisis flags

#### Testing Coverager

- Unit tests cover:
  - Message persistence operations
  - Session management
  - WebSocket communication
  - AI integration
  - Error handling
  - Crisis detection
  - Rate limiting

#### Security Measuresr

- Rate limiting per user and per message
- Session validation
- Input sanitization
- Crisis detection and logging
- Security audit logging

## Lessons to Learn

- Always include error handling for database operations
- Use TypeScript interfaces for better type safety
- Implement comprehensive logging for debugging
- Use dependency injection for better testability
- Keep security audit logs for all critical operations

## Documentation Migration Progress

## Core Documentation

[X] System Architecture Documentation

- Created comprehensive overview of system components
- Added security architecture diagrams
- Included scalability and monitoring sections

[X] Authentication Documentation

- Detailed authentication flows
- Security best practices
- Implementation guides

[X] Session Management Documentation

- WebSocket communication
- State management
- Error handling
- Performance optimization

[X] AI Integration Documentation

- Provider integration details
- Model selection strategy
- Core AI features
- Monitoring and optimization

## Next Steps 2

- Database documentation
- API endpoint testing
- Review and verify all documentation links
- Ensure Mintlify theme renders correctly

## Lessons to Learn More

- Maintain consistent structure across documentation files
- Use diagrams to illustrate complex flows
- Include practical code examples
- Link related sections for easy navigation
