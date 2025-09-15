# Contributing to Next.js MCP Client

Thank you for your interest in contributing to the Next.js MCP Client! This project aims to provide a robust client implementation for the Model Context Protocol (MCP) with OAuth authentication support.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/nextjs-mcp-client.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Environment Variables

Copy `.env.example` to `.env.local` and configure any necessary environment variables.

### Running the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Code Style

We use Biome for linting and formatting. Before submitting a PR:

```bash
# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check TypeScript types
npm run typecheck
```

## Testing

Before submitting a PR, ensure:

1. All TypeScript errors are resolved: `npm run typecheck`
2. All linting issues are fixed: `npm run lint`
3. The production build works: `npm run build`

## Pull Request Process

1. **Branch Naming**: Use descriptive branch names:
   - `feature/add-new-mcp-server`
   - `fix/oauth-token-refresh`
   - `docs/update-readme`

2. **Commit Messages**: Write clear, concise commit messages:
   - Start with a verb (Add, Fix, Update, Remove)
   - Keep the first line under 50 characters
   - Add detailed description if needed

3. **PR Description**: Include:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots for UI changes

4. **Code Review**: Be open to feedback and address review comments promptly.

## Adding New MCP Servers

To add a new MCP server to the remote library:

1. Edit `components/remote-mcp-library-simple.tsx`
2. Add the server configuration to the `REMOTE_SERVERS` array
3. Follow the existing format:

```typescript
{
  name: "Server Name",
  description: "Brief description",
  icon: "emoji-icon",
  url: "https://server-url.com/sse",
  documentation: "https://docs-url.com",
  authentication: {
    type: "OAuth2.1" | "Bearer" | "None",
    oauth?: {
      authorizationEndpoint: "...",
      tokenEndpoint: "...",
      clientId: "...",
      scope: "...",
    }
  }
}
```

## Architecture Overview

### Key Components

- **MCP Client Manager**: Handles MCP server connections (`lib/mcp/`)
- **OAuth Service**: Manages OAuth authentication flows (`lib/services/oauth-service.ts`)
- **Remote MCP Library**: UI for browsing and connecting to remote servers (`components/remote-mcp-library-simple.tsx`)
- **Server Manager**: UI for managing connected servers (`components/server-manager-shadcn.tsx`)

### API Routes

- `/api/mcp/connect-sse`: Establishes SSE connections to remote MCP servers
- `/api/mcp/oauth/*`: Handles OAuth authentication flows
- `/api/chat-claude`: Interfaces with Claude API for chat functionality

## Common Issues

### OAuth Authentication

- Ensure the OAuth callback URL is correctly configured: `http://localhost:3000/oauth/callback`
- Check that the server supports dynamic client registration or has pre-configured client credentials

### Build Errors

- Run `npm run typecheck` to identify TypeScript issues
- Run `npm run lint:fix` to auto-fix formatting issues
- Clear build cache if needed: `rm -rf .next .turbo`

## Security

- Never commit sensitive information (API keys, tokens, secrets)
- Always validate and sanitize user input
- Use environment variables for configuration
- Follow OAuth 2.1 best practices with PKCE

## Questions?

If you have questions or need help:

1. Check existing [issues](https://github.com/your-username/nextjs-mcp-client/issues)
2. Create a new issue with a clear description
3. Join discussions in pull requests

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.