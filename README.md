# Next.js MCP Client

<img width="1733" height="992" alt="image" src="https://github.com/user-attachments/assets/9faeb5b0-3193-4ae2-bc2f-025d23aca1c2" />
<img width="1733" height="992" alt="image" src="https://github.com/user-attachments/assets/661ad6c7-f81b-410b-a82b-41a76db1f885" />

A powerful Next.js application for connecting to and interacting with Model Context Protocol (MCP) servers, featuring OAuth authentication, remote server support, and seamless integration with Claude AI.

Demo Railway app: [Link](https://nextjs-mcp-client-production.up.railway.app)

Note: The MCP Servers won't start on any serverless NextJs deployment, it has to be deployed as a container to be able to start the servers.

## Features

- 🔌 **Multi-Server Management**: Connect to multiple MCP servers simultaneously (local and remote)
- 🌐 **Remote MCP Support**: Browse and connect to 70+ remote MCP servers with built-in OAuth flows
- 🔐 **OAuth Authentication**: Automatic OAuth 2.1 flow handling with PKCE support
- 💬 **Claude Integration**: Chat interface with Claude (Opus, Sonnet, Haiku) that can use MCP tools
- 📁 **Configuration Import**: Upload MCP configuration files (Claude Desktop compatible)
- 🛠️ **Tool Discovery**: Automatically discover and use tools from connected servers
- 📊 **Real-time Monitoring**: Live server status and connection health tracking
- 🎨 **Modern UI**: Clean, responsive interface built with shadcn/ui and Tailwind CSS
- 🔄 **Token Persistence**: OAuth tokens are stored securely for seamless reconnection

## Prerequisites

- Node.js 18.x or higher
- Anthropic API key for Claude access
- MCP servers to connect to (e.g., filesystem, GitHub, Context7, Perplexity, etc.)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nextjs-mcp-client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

4. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

Optionally, add OpenAI API key if you want to use GPT models:
```
OPENAI_API_KEY=your-openai-api-key-here
```

## Usage

### Starting the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Connecting to MCP Servers

#### Option 1: Remote MCP Servers (Recommended for Quick Start)
1. Click on "Remote MCP Library" in the interface
2. Browse the collection of 70+ pre-configured MCP servers
3. Click "Connect" on any server
4. For OAuth-enabled servers, complete the authentication flow in the popup window
5. The server will connect automatically and tools will be available in the chat

#### Option 2: Configuration File Upload
1. Click "Download Sample Configuration" to get a template
2. Modify it with your MCP server settings
3. Upload the configuration file
4. Servers will connect automatically

#### Option 3: Manual Configuration
1. Use the server manager to add servers manually
2. Provide the command, arguments, and environment variables
3. Connect to start using the server

## MCP Configuration Format

The configuration file follows the same format as Claude Desktop:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

## Available MCP Servers

### Local MCP Servers
Install and use any MCP-compatible server locally:
- `@modelcontextprotocol/server-filesystem` - File system access
- `@modelcontextprotocol/server-github` - GitHub integration
- `@modelcontextprotocol/server-gitlab` - GitLab integration
- `@modelcontextprotocol/server-slack` - Slack integration

### Remote MCP Servers
The app includes 70+ pre-configured remote MCP servers including:
- **AI/ML**: OpenAI, Anthropic, Google AI, Perplexity, Replicate
- **Development**: GitHub, GitLab, Linear, Sentry, Vercel
- **Productivity**: Notion, Slack, Asana, Monday.com, ClickUp
- **Data**: PostgreSQL, MySQL, MongoDB, Supabase, Firebase
- **Cloud**: AWS, Google Cloud, Azure, Cloudflare
- **And many more!**

Each remote server comes with:
- Pre-configured OAuth settings (where applicable)
- Automatic token management
- One-click connection

## Architecture

### Technology Stack
- **Next.js 15.5** with App Router and Turbopack
- **TypeScript** for type safety
- **Zustand** for state management
- **@modelcontextprotocol/sdk** for MCP client implementation
- **Anthropic SDK** for Claude integration
- **OpenAI SDK** (optional) for GPT model support
- **shadcn/ui** and **Tailwind CSS** for UI components
- **Biome** for linting and code formatting

### Transport Layers
- **Stdio Transport**: For local MCP servers
- **SSE Transport**: For remote MCP servers
- **OAuth 2.1**: With PKCE support for secure authentication

## Security Considerations

- **API Keys**: Never expose your OpenAI API key in the frontend
- **MCP Servers**: Only connect to trusted MCP servers
- **Permissions**: Review permission requests carefully before granting
- **File Access**: Be cautious with filesystem servers - limit access to specific directories

## Development

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat-claude/        # Claude chat endpoint
│   │   ├── mcp/               # MCP server management
│   │   │   ├── connect-sse/   # SSE connection endpoint
│   │   │   └── oauth/         # OAuth flow handlers
│   │   └── oauth/             # OAuth token management
│   ├── oauth/callback/        # OAuth callback page
│   └── page.tsx               # Main application
├── components/
│   ├── chat-interface-claude.tsx  # Claude chat UI
│   ├── remote-mcp-library-simple.tsx # Remote MCP browser
│   ├── server-manager-shadcn.tsx  # Server management UI
│   ├── config-uploader.tsx    # Configuration upload
│   └── mcp/                   # MCP-specific components
│       └── auth-dialog.tsx    # OAuth authentication dialog
├── lib/
│   ├── mcp/                   # MCP client implementations
│   │   ├── client-manager-v2.ts
│   │   └── client-manager-oauth.ts
│   ├── services/
│   │   └── oauth-service.ts   # OAuth service layer
│   ├── stores/
│   │   └── mcp-store.ts       # Zustand store
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Utility functions
│       └── token-storage.ts   # OAuth token persistence
```

### Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run linting
npm run lint:fix     # Auto-fix linting issues
npm run typecheck    # Check TypeScript types
```

### Adding New Remote MCP Servers

Edit `components/remote-mcp-library-simple.tsx` and add your server to the `REMOTE_SERVERS` array. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Troubleshooting

### OAuth Authentication Issues
- **"One or more redirect URIs are not allowed"**: Set the `NEXT_PUBLIC_APP_URL` environment variable to your deployed URL
- **"Failed to complete OAuth flow"**: The server may require pre-registered OAuth clients
- **Popup blocked**: Ensure popups are allowed for your domain
- **Token expired**: Tokens are automatically refreshed, but you can manually reconnect if needed
- **Wrong redirect URL**: Make sure `NEXT_PUBLIC_APP_URL` matches your actual deployment URL (no trailing slash)

### Server Connection Issues
- **Local servers**: Ensure the MCP server package is installed (`npm install -g @modelcontextprotocol/server-name`)
- **Remote servers**: Check your internet connection and firewall settings
- **"Connection closed"**: The server may be down or experiencing issues

### Claude Integration
- Verify your Anthropic API key is valid and has sufficient credits
- Check that you have access to the selected Claude model
- Review browser console for detailed error messages

### Build/Development Issues
- Clear build cache: `rm -rf .next .turbo`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: Must be 18.x or higher

## Deployment

### Railway Deployment

This application is optimized for deployment on [Railway](https://railway.app):

1. **Fork or Clone** this repository
2. **Connect to Railway**:
   - Create a new project on Railway
   - Connect your GitHub repository
   - Railway will auto-detect the Next.js configuration

3. **Set Environment Variables** in Railway:
   ```
   ANTHROPIC_API_KEY=your-anthropic-api-key
   OPENAI_API_KEY=your-openai-api-key (optional)
   NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app
   ```

   **Important**: Set `NEXT_PUBLIC_APP_URL` to your Railway app's URL (without trailing slash) for OAuth to work correctly.

4. **Deploy**:
   - Railway will automatically build and deploy your app
   - The app uses `nixpacks.toml` and `railway.json` for optimal configuration
   - Deployment typically takes 3-5 minutes

5. **Custom Domain** (optional):
   - Add a custom domain in Railway's settings
   - Update `NEXT_PUBLIC_APP_URL` to match your custom domain
   - OAuth callbacks will automatically use the correct URL

### Configuration Files

- `railway.json` - Railway-specific deployment settings
- `nixpacks.toml` - Build configuration for Railway's Nixpacks
- `next.config.ts` - Next.js configuration with Railway optimizations

## License

MIT

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Code style and standards
- Adding new MCP servers
- Submitting pull requests
- Reporting issues

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io) specification
- Remote MCP servers sourced from [awesome-remote-mcp-servers](https://github.com/jaw9c/awesome-remote-mcp-servers)
- UI components from [shadcn/ui](https://ui.shadcn.com)
