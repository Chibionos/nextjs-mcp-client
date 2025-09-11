import { NextRequest, NextResponse } from 'next/server';
import { getGlobalClientManager } from '@/lib/mcp/global-client-manager';

export async function GET(request: NextRequest) {
  try {
    const manager = getGlobalClientManager();
    const servers = manager.getAllServerStates();
    const tools = manager.getAllTools();
    
    return NextResponse.json({
      connectedServers: servers.filter(s => s.status === 'connected').length,
      totalServers: servers.length,
      totalTools: tools.length,
      servers: servers.map(s => ({
        name: s.name,
        status: s.status,
        toolCount: s.capabilities?.tools?.length || 0,
      })),
      tools: tools.map(t => ({
        server: t.serverName,
        name: t.tool.name,
      })),
    });

  } catch (error) {
    console.error('Failed to get MCP status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}