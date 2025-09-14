import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { 
  MCPServerConfig, 
  ServerState, 
  ServerStatus, 
  ServerCapabilities,
} from '@/lib/types/mcp';
import { OAuthService } from '@/lib/services/oauth-service';
import { AuthStatus, OAuthConfig } from '@/lib/types/oauth';
import { EnhancedSSETransport } from './sse-transport-enhanced';

export interface ConnectionOptions {
  onStatusChange?: (status: ServerStatus) => void;
  onError?: (error: Error) => void;
  onAuthRequired?: (serverName: string) => void;
}

interface ServerAuthState {
  status: AuthStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export class MCPClientManagerWithOAuth {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, any> = new Map();
  private enhancedTransports: Map<string, EnhancedSSETransport> = new Map();
  private serverStates: Map<string, ServerState> = new Map();
  private connectionOptions: Map<string, ConnectionOptions> = new Map();
  private authStates: Map<string, ServerAuthState> = new Map();
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = OAuthService.getInstance();
  }

  /**
   * Connect to an MCP server with OAuth support
   */
  async connectServer(
    name: string, 
    config: MCPServerConfig,
    options?: ConnectionOptions
  ): Promise<ServerState> {
    try {
      // Store connection options
      if (options) {
        this.connectionOptions.set(name, options);
      }

      // Update status to connecting
      this.updateServerState(name, { 
        name,
        config,
        status: ServerStatus.CONNECTING 
      });

      // Check if this is an SSE endpoint with OAuth
      if (this.isSSEEndpoint(config.command) && config.oauth) {
        // Check if we have valid auth
        const authState = this.authStates.get(name);
        
        if (!authState || !this.isTokenValid(authState)) {
          // Need to authenticate
          const authResult = await this.authenticate(name, config.oauth);
          
          if (!authResult.success) {
            throw new Error(authResult.error || 'Authentication failed');
          }

          // Store auth state
          this.authStates.set(name, {
            status: AuthStatus.AUTHENTICATED,
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            tokenExpiry: authResult.expiresIn 
              ? Date.now() + (authResult.expiresIn * 1000)
              : undefined,
          });

          // Update config with auth header
          config = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${authResult.accessToken}`,
            },
          };
        } else if (authState.accessToken) {
          // Use existing token
          config = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${authState.accessToken}`,
            },
          };
        }
      }

      // Create transport based on config
      const transport = await this.createTransport(config, name);
      this.transports.set(name, transport);

      // Create and initialize client
      const client = new Client(
        {
          name: `nextjs-mcp-client-${name}`,
          version: '1.0.0',
        },
        {
          capabilities: {
            roots: {
              listChanged: true,
            },
            sampling: {},
          },
        }
      );

      // Connect the client
      await client.connect(transport);
      this.clients.set(name, client);

      // Get server capabilities
      const capabilities = await this.discoverCapabilities(client);

      // Update server state with capabilities
      const serverState: ServerState = {
        name,
        config,
        status: ServerStatus.CONNECTED,
        capabilities,
      };

      this.updateServerState(name, serverState);
      return serverState;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to connect to server ${name}:`, error);
      
      // Check if auth error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        // Clear auth and notify
        this.authStates.delete(name);
        options?.onAuthRequired?.(name);
      }
      
      const errorState: ServerState = {
        name,
        config,
        status: ServerStatus.ERROR,
        error: errorMessage,
      };
      
      this.updateServerState(name, errorState);
      
      // Call error handler if provided
      const opts = this.connectionOptions.get(name);
      if (opts?.onError) {
        opts.onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      throw error;
    }
  }

  /**
   * Authenticate with OAuth
   */
  private async authenticate(name: string, oauthConfig: any) {
    // Build OAuth config with redirect URI
    const config: OAuthConfig = {
      authorizationEndpoint: oauthConfig.authorizationEndpoint,
      tokenEndpoint: oauthConfig.tokenEndpoint,
      clientId: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      redirectUri: `${window.location.origin}/oauth/callback`,
      scope: oauthConfig.scope || 'read write',
      usePKCE: oauthConfig.usePKCE !== false,
    };

    return await this.oauthService.startAuthFlow(name, config);
  }

  /**
   * Check if token is still valid
   */
  private isTokenValid(authState: ServerAuthState): boolean {
    if (!authState.accessToken) return false;
    if (!authState.tokenExpiry) return true; // No expiry info, assume valid
    
    // Check if token expires in next 5 minutes
    return authState.tokenExpiry > (Date.now() + 5 * 60 * 1000);
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(name: string): Promise<boolean> {
    const authState = this.authStates.get(name);
    const config = this.serverStates.get(name)?.config;
    
    if (!authState || !config?.oauth || !authState.refreshToken) {
      return false;
    }

    if (this.isTokenValid(authState)) {
      return true; // Token still valid
    }

    // Refresh the token
    const result = await this.oauthService.refreshAccessToken(
      authState.refreshToken,
      {
        authorizationEndpoint: config.oauth.authorizationEndpoint,
        tokenEndpoint: config.oauth.tokenEndpoint,
        clientId: config.oauth.clientId,
        clientSecret: config.oauth.clientSecret,
        redirectUri: `${window.location.origin}/oauth/callback`,
        scope: config.oauth.scope,
        usePKCE: config.oauth.usePKCE !== false,
      }
    );

    if (result.success && result.accessToken) {
      // Update auth state
      this.authStates.set(name, {
        status: AuthStatus.AUTHENTICATED,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || authState.refreshToken,
        tokenExpiry: result.expiresIn 
          ? Date.now() + (result.expiresIn * 1000)
          : undefined,
      });

      // Reconnect with new token
      await this.reconnectServer(name);
      return true;
    }

    return false;
  }

  /**
   * Check if URL is an SSE endpoint
   */
  private isSSEEndpoint(command: string): boolean {
    return command.startsWith('http://') || command.startsWith('https://');
  }

  /**
   * Create appropriate transport based on configuration
   */
  private async createTransport(config: MCPServerConfig, name: string): Promise<any> {
    // Check if this is an SSE endpoint
    if (this.isSSEEndpoint(config.command)) {
      // SSE transport for HTTP endpoints
      const url = new URL(config.command);

      // Create enhanced SSE transport with retry and keep-alive
      const enhancedTransport = new EnhancedSSETransport(url, config.headers);

      // Set up event handlers
      enhancedTransport.on('error', (error) => {
        console.error(`SSE transport error for ${name}:`, error);
        this.connectionOptions.get(name)?.onError?.(error);
      });

      enhancedTransport.on('reconnecting', ({ attempt, delay }) => {
        console.log(`Reconnecting ${name}: attempt ${attempt}, delay ${delay}ms`);
        this.updateServerState(name, {
          ...this.serverStates.get(name)!,
          status: ServerStatus.CONNECTING,
        });
      });

      enhancedTransport.on('reconnected', () => {
        console.log(`Successfully reconnected to ${name}`);
        this.updateServerState(name, {
          ...this.serverStates.get(name)!,
          status: ServerStatus.CONNECTED,
        });
      });

      enhancedTransport.on('timeout', () => {
        console.warn(`Connection timeout for ${name}`);
      });

      enhancedTransport.on('max_reconnect_exceeded', () => {
        console.error(`Max reconnection attempts exceeded for ${name}`);
        this.updateServerState(name, {
          ...this.serverStates.get(name)!,
          status: ServerStatus.ERROR,
          error: 'Max reconnection attempts exceeded',
        });
      });

      // Store the enhanced transport
      this.enhancedTransports.set(name, enhancedTransport);

      // Connect and return the underlying transport
      const transport = await enhancedTransport.connect();
      return transport;
    }

    // For stdio transport, dynamically import it only on server side
    if (typeof window === 'undefined') {
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      return new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });
    } else {
      throw new Error('Stdio transport is not supported in the browser. Please use a server-side API route.');
    }
  }

  /**
   * Discover server capabilities
   */
  private async discoverCapabilities(client: Client): Promise<ServerCapabilities> {
    const capabilities: ServerCapabilities = {};

    try {
      // List available tools
      const { tools } = await client.listTools();
      if (tools && tools.length > 0) {
        capabilities.tools = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
      }
    } catch (error) {
      console.warn('Failed to list tools:', error);
    }

    try {
      // List available resources
      const { resources } = await client.listResources();
      if (resources && resources.length > 0) {
        capabilities.resources = resources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }));
      }
    } catch (error) {
      console.warn('Failed to list resources:', error);
    }

    try {
      // List available prompts
      const { prompts } = await client.listPrompts();
      if (prompts && prompts.length > 0) {
        capabilities.prompts = prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        }));
      }
    } catch (error) {
      console.warn('Failed to list prompts:', error);
    }

    return capabilities;
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(name: string): Promise<void> {
    try {
      // Close the client
      const client = this.clients.get(name);
      if (client) {
        await client.close();
        this.clients.delete(name);
      }

      // Close enhanced transport if exists
      const enhancedTransport = this.enhancedTransports.get(name);
      if (enhancedTransport) {
        await enhancedTransport.close();
        this.enhancedTransports.delete(name);
      }

      // Close the transport
      const transport = this.transports.get(name);
      if (transport) {
        await transport.close();
        this.transports.delete(name);
      }

      // Clear auth state
      this.authStates.delete(name);
      this.oauthService.clearAuth(name);

      // Update status
      this.updateServerState(name, {
        name,
        config: this.serverStates.get(name)?.config || { command: '', args: [] },
        status: ServerStatus.DISCONNECTED,
      });
      
      // Clear connection options
      this.connectionOptions.delete(name);
      
    } catch (error) {
      console.error(`Error disconnecting from server ${name}:`, error);
    }
  }

  /**
   * Reconnect to a server
   */
  async reconnectServer(name: string): Promise<ServerState> {
    const config = this.serverStates.get(name)?.config;
    const options = this.connectionOptions.get(name);
    
    if (!config) {
      throw new Error(`No configuration found for server ${name}`);
    }

    // Disconnect first
    await this.disconnectServer(name);
    
    // Then connect again
    return await this.connectServer(name, config, options);
  }

  /**
   * Update server state
   */
  private updateServerState(name: string, state: ServerState): void {
    this.serverStates.set(name, state);
    
    // Notify status change
    const options = this.connectionOptions.get(name);
    if (options?.onStatusChange) {
      options.onStatusChange(state.status);
    }
  }

  /**
   * Get server state
   */
  getServerState(name: string): ServerState | undefined {
    return this.serverStates.get(name);
  }

  /**
   * Get client for a server
   */
  getClient(name: string): Client | undefined {
    return this.clients.get(name);
  }

  /**
   * Get auth state for a server
   */
  getAuthState(name: string): ServerAuthState | undefined {
    return this.authStates.get(name);
  }

  /**
   * List all connected servers
   */
  listServers(): ServerState[] {
    return Array.from(this.serverStates.values());
  }
}