import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { getGlobalClientManager } from '@/lib/mcp/global-client-manager';
import { ServerStatus } from '@/lib/types/mcp';

export async function POST(request: NextRequest) {
  try {
    const { name, url, authToken } = await request.json();

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Server name and URL are required' },
        { status: 400 }
      );
    }

    console.log(`[MCP] Connecting to remote SSE server: ${name} at ${url}`);
    console.log(`[MCP] Auth token provided: ${!!authToken}`);

    if (authToken) {
      console.log(`[MCP] Token length: ${authToken.length}`);
      console.log(`[MCP] Token preview: ${authToken.substring(0, 20)}...`);
    }

    const clientManager = getGlobalClientManager();

    // Create headers with authentication if provided
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log(`[MCP] Adding Bearer token to headers`);
      console.log(`[MCP] Full Authorization header: ${headers['Authorization'].substring(0, 30)}...`);
    }

    // Create URL object
    const serverUrl = new URL(url);
    
    // Try direct SSE transport first for debugging
    console.log('[MCP] Creating direct SSEClientTransport...');
    const sseTransport = new SSEClientTransport(serverUrl, {
      requestInit: {
        headers: headers
      }
    });
    
    // Create MCP client
    const client = new Client(
      {
        name: `nextjs-mcp-client-${name}`,
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect the client to the transport
    await client.connect(sseTransport);

    // Initialize the connection - try to list tools to verify connection
    let tools: any = null;
    try {
      tools = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
      console.log(`[MCP] Successfully connected to ${name}, tools:`, tools?.tools?.length || 0);
    } catch (error) {
      console.warn(`[MCP] Could not list tools for ${name}, but connection may still work:`, error);
    }

    // For now, just store the client in the manager manually
    // TODO: Update the client manager to properly handle remote SSE clients
    clientManager['clients'].set(name, client);
    clientManager['updateServerState'](name, {
      name,
      config: {
        command: url, // Store URL in command for now
        headers: authToken ? { Authorization: `Bearer ***` } : undefined,
      } as any,
      status: ServerStatus.CONNECTED,
      capabilities: {
        tools: tools?.tools || [],
      },
    });

    return NextResponse.json({
      success: true,
      server: {
        name,
        config: {
          type: 'remote-sse',
          url,
          authToken: authToken ? '***' : undefined,
        },
        status: ServerStatus.CONNECTED,
        toolCount: tools.tools?.length || 0,
      },
    });
    
  } catch (error) {
    console.error('[MCP] Failed to connect to SSE server:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to connect to server';
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please check your access token.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Server endpoint not found. Please check the URL.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}