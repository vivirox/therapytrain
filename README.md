# TherapyTrain AI

A HIPAA-compliant AI-powered platform for therapist training and skill development.

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 9.15.3+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/therapytrain.git
cd therapytrain
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the environment variables:
```bash
cp .env.example .env
```

4. Update the environment variables in `.env` with your values

### Development

Run the development server:

```bash
pnpm dev
```

### Building for Production

Build the application:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Deployment

### Deploying to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Or configure GitHub integration for automatic deployments.

### Environment Variables

Make sure to configure the following environment variables in your Vercel project settings:

- `VITE_APP_TITLE`
- `VITE_APP_ENV`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`
- `VITE_ANTHROPIC_API_KEY`
- `VITE_GOOGLE_ANALYTICS_ID`

## Features

- HIPAA-compliant platform
- AI-powered training scenarios
- Real-time feedback
- Progress tracking
- Skill certification
- Secure environment

## License

[License Type] - See LICENSE file for details

# TherapyTrain - Advanced Therapy Training Simulator

![Black Mage Vivi](public/vivi-master.jpg)

TherapyTrain is a sophisticated therapy training platform that enables therapists to practice and enhance their skills through simulated client interactions. The platform uses advanced AI and real-time analytics to provide comprehensive training scenarios and feedback.

## Key Features

- Real-time sentiment analysis and behavioral pattern detection
- Multi-modal session support (video, text, hybrid)
- Interactive scenario-based training with branching pathways
- Comprehensive analytics and progress tracking
- Advanced security with end-to-end encryption and zero-knowledge proofs
- Extensive case study library and skill progression system

## Development Status

Current project completion: ~85%

### Major Components Status

- Enhanced Real-time Analytics (95%)
- Advanced Session Features (95%)
- Expanded Educational Resources (85%)
- AI Model Improvements (75%)
- Enhanced Security Features (85%)
- Zero-Knowledge Implementation (65%)

## Technology Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Contributing

You can contribute to this project in several ways:

1. **Direct GitHub Edits**: Edit files directly through GitHub's interface
2. **Local Development**: Clone and work with your preferred IDE
3. **GitHub Codespaces**: Use GitHub's cloud development environment

## Security Features

- End-to-end encryption
- Zero-Knowledge Security System
- Role-based access control
- Advanced authorization system
- Comprehensive data protection
- Security monitoring and audit trails
