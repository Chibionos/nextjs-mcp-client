import { MCPClientManagerV2 } from "./client-manager-v2";

// Declare global type for TypeScript using globalThis
declare global {
  var __mcpClientManager: MCPClientManagerV2 | undefined;
}

export function getGlobalClientManager(): MCPClientManagerV2 {
  // Use globalThis for cross-platform compatibility (works in both Node.js and browser)
  if (!globalThis.__mcpClientManager) {
    console.log("[MCP] Creating new global client manager instance");
    globalThis.__mcpClientManager = new MCPClientManagerV2();
  } else {
    console.log("[MCP] Using existing global client manager instance");
  }

  return globalThis.__mcpClientManager;
}
