# Next.js MCP Client for Claude

<img width="1733" height="992" alt="image" src="https://github.com/user-attachments/assets/9faeb5b0-3193-4ae2-bc2f-025d23aca1c2" />
<img width="1733" height="992" alt="image" src="https://github.com/user-attachments/assets/661ad6c7-f81b-410b-a82b-41a76db1f885" />

A Next.js application that enables Claude to connect and interact with Model Context Protocol (MCP) servers, following the official MCP documentation and best practices.
Demo Railway app: nextjs-mcp-client-production.up.railway.app

Note: The MCP Servers won't start on any serverless NextJs deployment, it has to be deployed as a container to be able to start the servers.

## Features

- 🔌 **MCP Server Management**: Connect to multiple MCP servers simultaneously
- 💬 **Claude Integration**: Chat interface with Claude (Opus, Sonnet, Haiku) that can use MCP tools
- 📁 **Configuration Import**: Upload MCP configuration files (same format as Claude Desktop)
- 🔐 **Permission Management**: Handle permission requests from MCP servers
- 🛠️ **Tool Discovery**: Automatically discover and use tools from connected servers
- 📊 **Server Monitoring**: Real-time status monitoring for all connected servers
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS

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

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Upload your MCP configuration file or use the sample configuration:
   - Click "Download Sample Configuration" to get a template
   - Modify it with your MCP server settings
   - Upload the configuration file

4. The servers will automatically connect and you can start chatting with Claude

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

You can use any MCP-compatible server. Some official examples:

- `@modelcontextprotocol/server-filesystem` - File system access
- `@modelcontextprotocol/server-github` - GitHub integration
- `@modelcontextprotocol/server-gitlab` - GitLab integration
- `@modelcontextprotocol/server-slack` - Slack integration

## Architecture

The application uses:
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Zustand** for state management
- **@modelcontextprotocol/sdk** for MCP client implementation
- **Anthropic SDK** for Claude integration
- **OpenAI SDK** (optional) for GPT model support
- **Tailwind CSS** for styling
- **Stdio and SSE transports** for MCP server communication

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
│   │   ├── chat-claude/   # Claude chat endpoint
│   │   ├── chat/          # GPT chat endpoint (optional)
│   │   └── mcp/           # MCP server management endpoints
│   └── page.tsx           # Main application page
├── components/
│   ├── chat-interface-claude.tsx # Claude chat UI component
│   ├── chat-interface.tsx # GPT chat UI (optional)
│   ├── server-manager.tsx # Server management UI
│   ├── config-uploader.tsx # Configuration upload UI
│   └── permission-dialog.tsx # Permission request dialog
├── lib/
│   ├── mcp/
│   │   ├── client-manager.ts # Original MCP client
│   │   └── client-manager-v2.ts # Enhanced MCP client with proper transport handling
│   ├── stores/
│   │   └── mcp-store.ts   # Zustand store
│   └── types/
│       └── mcp.ts         # TypeScript types
```

### Adding New Features

1. **New MCP Methods**: Update `client-manager.ts` to add new MCP protocol methods
2. **UI Components**: Add new components in the `components/` directory
3. **API Routes**: Add new endpoints in `app/api/` for server-side functionality

## Troubleshooting

### Server Won't Connect
- Check that the command and args in your configuration are correct
- Ensure the MCP server package is installed globally or use `npx`
- Check server logs in the browser console

### Claude Not Responding
- Verify your Anthropic API key is valid
- Check that you have Claude API access on your Anthropic account
- Select a different Claude model if needed (Opus, Sonnet, Haiku)
- Review the browser console for error messages

### Permission Issues
- Some MCP servers require specific permissions
- Grant necessary permissions when prompted
- Check server documentation for required permissions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
