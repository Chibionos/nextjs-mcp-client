import { NextRequest, NextResponse } from 'next/server';
import { getGlobalClientManager } from '@/lib/mcp/global-client-manager';

export async function GET(request: NextRequest) {
  try {
    const manager = getGlobalClientManager();
    const servers = manager.getAllServerStates();
    const tools = manager.getAllTools();
    
    // Check global state
    const globalInfo = {
      hasGlobalManager: !!global.__mcpClientManager,
      globalManagerId: global.__mcpClientManager ? 'exists' : 'missing',
      processId: process.pid,
      nodeVersion: process.version,
    };
    
    return NextResponse.json({
      globalInfo,
      serverCount: servers.length,
      connectedCount: servers.filter(s => s.status === 'connected').length,
      toolCount: tools.length,
      servers: servers.map(s => ({
        name: s.name,
        status: s.status,
        hasCapabilities: !!s.capabilities,
        toolCount: s.capabilities?.tools?.length || 0,
        resourceCount: s.capabilities?.resources?.length || 0,
        promptCount: s.capabilities?.prompts?.length || 0,
      })),
      toolsByServer: servers.reduce((acc, server) => {
        if (server.capabilities?.tools) {
          acc[server.name] = server.capabilities.tools.map(t => t.name);
        }
        return acc;
      }, {} as Record<string, string[]>),
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}