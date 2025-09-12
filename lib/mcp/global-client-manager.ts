import { MCPClientManagerV2 } from './client-manager-v2';

// Declare global type for TypeScript
declare global {
  var __mcpClientManager: MCPClientManagerV2 | undefined;
}

export function getGlobalClientManager(): MCPClientManagerV2 {
  // Always check global first - this persists across API route invocations
  if (!global.__mcpClientManager) {
    console.log('[MCP] Creating new global client manager instance');
    global.__mcpClientManager = new MCPClientManagerV2();
  } else {
    console.log('[MCP] Using existing global client manager instance');
  }
  
  return global.__mcpClientManager;
}