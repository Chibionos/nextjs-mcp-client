import { MCPClientManagerV2 } from './client-manager-v2';

// Global singleton instance
let globalClientManager: MCPClientManagerV2 | null = null;

export function getGlobalClientManager(): MCPClientManagerV2 {
  if (!globalClientManager) {
    globalClientManager = new MCPClientManagerV2();
    
    // Store reference in global scope for Next.js hot reload
    if (typeof global !== 'undefined') {
      (global as any).__mcpClientManager = globalClientManager;
    }
  }
  
  // Use cached instance if available (for hot reload)
  if (typeof global !== 'undefined' && (global as any).__mcpClientManager) {
    globalClientManager = (global as any).__mcpClientManager;
  }
  
  return globalClientManager!;
}