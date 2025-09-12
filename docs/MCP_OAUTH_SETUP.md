# MCP OAuth Authentication Setup

This guide explains how to configure and use OAuth authentication for remote MCP SSE endpoints, including Atlassian's MCP server.

## Overview

The MCP client now supports OAuth 2.0 authentication for remote SSE endpoints using:
- Authorization Code flow with PKCE
- Automatic token refresh
- Secure popup-based authentication
- Token storage and management

## Configuration

### 1. Basic SSE Endpoint with Static Token

For endpoints that use a static API token or bearer token:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "https://api.example.com/sse",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### 2. SSE Endpoint with OAuth

For endpoints that require OAuth authentication:

```json
{
  "mcpServers": {
    "oauth-server": {
      "command": "https://api.example.com/sse",
      "oauth": {
        "authorizationEndpoint": "https://auth.example.com/oauth/authorize",
        "tokenEndpoint": "https://auth.example.com/oauth/token",
        "clientId": "YOUR_CLIENT_ID",
        "clientSecret": "YOUR_CLIENT_SECRET",  // Optional for PKCE
        "scope": "read write",
        "usePKCE": true  // Recommended for security
      }
    }
  }
}
```

### 3. Atlassian MCP Server Configuration

For Atlassian's remote MCP server:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "https://mcp.atlassian.com/sse",
      "oauth": {
        "authorizationEndpoint": "https://auth.atlassian.com/authorize",
        "tokenEndpoint": "https://auth.atlassian.com/oauth/token",
        "clientId": "YOUR_ATLASSIAN_CLIENT_ID",
        "scope": "read:jira-work read:confluence-content.all write:jira-work",
        "usePKCE": true
      }
    }
  }
}
```

## Authentication Flow

1. **Initial Connection**: When connecting to an SSE endpoint with OAuth configuration, the client checks for a valid access token.

2. **Authentication Popup**: If no valid token exists, an authentication dialog appears:
   - Click "Authenticate" to open the OAuth provider's login page
   - Sign in with your credentials
   - Grant permissions to the MCP client
   - The popup closes automatically after successful authentication

3. **Token Management**: The client automatically:
   - Stores the access token securely
   - Refreshes tokens before expiry
   - Re-authenticates if the token is revoked

## Setting Up OAuth Credentials

### For Atlassian

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 app
3. Set the redirect URI to: `https://your-domain.com/oauth/callback`
4. Copy the Client ID and Client Secret
5. Configure the required scopes for your use case

### For Custom MCP Servers

1. Register your application with your OAuth provider
2. Set the redirect URI to: `https://your-domain.com/oauth/callback`
3. Configure the required scopes
4. Note the authorization and token endpoints

## Deployment Considerations

### Railway Deployment

When deploying to Railway or similar platforms:

1. **Environment Variables**: Store sensitive credentials as environment variables:
   ```bash
   ATLASSIAN_CLIENT_ID=your_client_id
   ATLASSIAN_CLIENT_SECRET=your_client_secret
   ```

2. **Redirect URI**: Update the redirect URI to match your deployment URL:
   ```
   https://your-app.railway.app/oauth/callback
   ```

3. **CORS Configuration**: Ensure your OAuth provider allows your domain

### Security Best Practices

1. **Never commit credentials**: Use environment variables for sensitive data
2. **Use PKCE**: Always enable PKCE for public clients
3. **Scope minimization**: Request only the permissions you need
4. **Token storage**: Tokens are stored in memory and cleared on logout
5. **HTTPS only**: Always use HTTPS in production

## Troubleshooting

### Common Issues

1. **"Popup blocked" error**
   - Solution: Allow popups for your domain in browser settings

2. **"Invalid redirect URI" error**
   - Solution: Ensure the redirect URI matches exactly in both config and OAuth provider

3. **"401 Unauthorized" after authentication**
   - Solution: Check that the scope includes necessary permissions

4. **Token expiry issues**
   - Solution: The client should auto-refresh; if not, manually reconnect

### Debug Mode

To enable debug logging for OAuth flows:

```javascript
// In your browser console
localStorage.setItem('mcp_oauth_debug', 'true');
```

## API Reference

### OAuth Configuration Schema

```typescript
interface OAuthConfig {
  authorizationEndpoint: string;  // OAuth authorization URL
  tokenEndpoint: string;          // OAuth token exchange URL
  clientId: string;                // OAuth client ID
  clientSecret?: string;           // OAuth client secret (optional with PKCE)
  redirectUri?: string;            // Override redirect URI (auto-generated)
  scope?: string;                  // OAuth scopes (space-separated)
  usePKCE?: boolean;              // Enable PKCE (default: true)
}
```

### Authentication Events

The client emits these events during authentication:

- `auth:required` - Authentication needed
- `auth:success` - Authentication successful
- `auth:error` - Authentication failed
- `auth:refresh` - Token refreshed

## Examples

### Connecting with Authentication

```javascript
// In your application code
const config = {
  command: "https://mcp.atlassian.com/sse",
  oauth: {
    authorizationEndpoint: "https://auth.atlassian.com/authorize",
    tokenEndpoint: "https://auth.atlassian.com/oauth/token",
    clientId: process.env.ATLASSIAN_CLIENT_ID,
    scope: "read:jira-work",
    usePKCE: true
  }
};

// Connect to the server
await mcpClient.connect("atlassian", config);
```

### Handling Authentication in UI

The authentication dialog component handles the OAuth flow automatically. Users will see:

1. A dialog explaining authentication is required
2. Information about what permissions are requested
3. A button to start the authentication process
4. Automatic connection after successful authentication

## Support

For issues or questions:
- Check the [MCP Documentation](https://modelcontextprotocol.io)
- File issues on GitHub
- Contact your MCP server provider for specific OAuth setup