# 1Router Frontend

[![GitHub stars](https://img.shields.io/github/stars/1Router/1router-site)](https://github.com/1Router/1router-site/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/1Router/1router-site)](https://github.com/1Router/1router-site/network)
[![GitHub issues](https://img.shields.io/github/issues/1Router/1router-site)](https://github.com/1Router/1router-site/issues)
[![GitHub license](https://img.shields.io/github/license/1Router/1router-site)](https://github.com/1Router/1router-site/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.5-black)](https://nextjs.org)

This is the frontend application for [1Router](https://1router.com), built with [Next.js](https://nextjs.org). 1Router is a unified platform that provides seamless access to multiple AI models through a single API interface.

## About 1Router

1Router enables developers to access and switch between various AI models from providers like OpenAI, Anthropic, Google, Mistral, and more through a unified API interface.

### Key Features

- **Unified API**: Access multiple AI models with a single integration
- **Token-Optimized Routing**: Automatic request routing based on token efficiency
- **Pay-as-you-go Pricing**: No subscriptions - only pay for what you use
- **Custom Routing**: Prioritize models based on cost, latency, or custom criteria
- **OpenAI-Compatible API**: Minimal changes needed for existing OpenAI integrations

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

- `src/app/*` - Main application pages and routing
- `src/components/*` - Reusable UI components
- `src/lib/*` - Utility functions and shared logic

## Tech Stack

- **Framework**: Next.js 15.1.5
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **UI Components**: Radix UI

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/docs) - Unstyled, accessible UI components

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
