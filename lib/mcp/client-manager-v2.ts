import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { 
  MCPServerConfig, 
  ServerState, 
  ServerStatus, 
  ServerCapabilities,
  TransportType
} from '@/lib/types/mcp';

export interface ConnectionOptions {
  onStatusChange?: (status: ServerStatus) => void;
  onError?: (error: Error) => void;
}

export class MCPClientManagerV2 {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport | SSEClientTransport> = new Map();
  private serverStates: Map<string, ServerState> = new Map();
  private connectionOptions: Map<string, ConnectionOptions> = new Map();

  /**
   * Connect to an MCP server with proper transport handling
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

      // Create transport based on config
      const transport = await this.createTransport(config);
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
      
      const errorState: ServerState = {
        name,
        config,
        status: ServerStatus.ERROR,
        error: errorMessage,
      };
      
      this.updateServerState(name, errorState);
      
      // Call error handler if provided
      const options = this.connectionOptions.get(name);
      if (options?.onError) {
        options.onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      throw error;
    }
  }

  /**
   * Create appropriate transport based on configuration
   */
  private async createTransport(config: MCPServerConfig): Promise<StdioClientTransport | SSEClientTransport> {
    // Check if this is an SSE endpoint
    if (config.command.startsWith('http://') || config.command.startsWith('https://')) {
      // SSE transport for HTTP endpoints
      const url = new URL(config.command);
      
      // If we have headers (like auth), we need to use the proxy
      if (config.headers && Object.keys(config.headers).length > 0) {
        // Use proxy endpoint to add headers
        const proxyUrl = new URL('/api/mcp/sse-proxy', window.location.origin);
        proxyUrl.searchParams.set('url', config.command);
        
        // Add auth header if present
        if (config.headers['Authorization']) {
          proxyUrl.searchParams.set('auth', config.headers['Authorization']);
        }
        
        return new SSEClientTransport(proxyUrl);
      }
      
      return new SSEClientTransport(url);
    }

    // Default to stdio transport for local processes
    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });
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

      // Close the transport
      const transport = this.transports.get(name);
      if (transport) {
        await transport.close();
        this.transports.delete(name);
      }

      // Update status
      this.updateServerState(name, {
        name,
        config: this.serverStates.get(name)?.config || { command: '', args: [] },
        status: ServerStatus.DISCONNECTED,
      });
      
      // Clean up
      this.serverStates.delete(name);
      this.connectionOptions.delete(name);

    } catch (error) {
      console.error(`Failed to disconnect server ${name}:`, error);
      throw error;
    }
  }

  /**
   * Call a tool on a server
   */
  async callTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      // Handle different content types
      const contentArray = result.content as any[];
      if (Array.isArray(contentArray)) {
        // If multiple content items, return them all
        if (contentArray.length === 1) {
          // If single content item, return just the content
          const content = contentArray[0];
          if (content.type === 'text') {
            return content.text;
          }
          return content;
        }
        return contentArray;
      }
      
      return result.content;
    } catch (error) {
      console.error(`Failed to call tool ${toolName} on server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Read a resource from a server
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    try {
      const result = await client.readResource({ uri });
      return result.contents;
    } catch (error) {
      console.error(`Failed to read resource ${uri} from server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Get a prompt from a server
   */
  async getPrompt(serverName: string, promptName: string, args: Record<string, string> = {}): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    try {
      const result = await client.getPrompt({
        name: promptName,
        arguments: args,
      });
      return result.messages;
    } catch (error) {
      console.error(`Failed to get prompt ${promptName} from server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Update server state and notify listeners
   */
  private updateServerState(name: string, state: ServerState): void {
    this.serverStates.set(name, state);
    
    // Notify status change listener
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
   * Get all server states
   */
  getAllServerStates(): ServerState[] {
    return Array.from(this.serverStates.values());
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(name: string): boolean {
    const state = this.serverStates.get(name);
    return state?.status === ServerStatus.CONNECTED;
  }

  /**
   * Reconnect to a server
   */
  async reconnectServer(name: string): Promise<ServerState> {
    const currentState = this.serverStates.get(name);
    if (!currentState) {
      throw new Error(`Server ${name} not found`);
    }

    // Disconnect first if connected
    if (this.isServerConnected(name)) {
      await this.disconnectServer(name);
    }

    // Reconnect with existing options
    const options = this.connectionOptions.get(name);
    return this.connectServer(name, currentState.config, options);
  }

  /**
   * Get available tools from all connected servers
   */
  getAllTools(): Array<{ serverName: string; tool: any }> {
    const allTools: Array<{ serverName: string; tool: any }> = [];
    
    for (const state of this.serverStates.values()) {
      if (state.status === ServerStatus.CONNECTED && state.capabilities?.tools) {
        for (const tool of state.capabilities.tools) {
          allTools.push({ serverName: state.name, tool });
        }
      }
    }
    
    return allTools;
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map(name => 
      this.disconnectServer(name).catch(err => 
        console.error(`Failed to disconnect ${name} during cleanup:`, err)
      )
    );
    await Promise.all(disconnectPromises);
  }
}