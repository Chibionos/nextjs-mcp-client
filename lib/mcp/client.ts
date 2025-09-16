// MCP client integration for voice agent
import { MCPClientManagerV2 } from "./client-manager-v2";
import { getGlobalClientManager } from "./global-client-manager";
import { ServerStatus, ToolDefinition } from "@/lib/types/mcp";

export class MCPVoiceClient {
  private manager: MCPClientManagerV2;

  constructor() {
    this.manager = getGlobalClientManager();
  }

  /**
   * Get all available tools from connected MCP servers
   */
  async getAvailableTools(): Promise<
    Array<{
      serverName: string;
      tool: ToolDefinition;
      fullName: string;
    }>
  > {
    const allTools: Array<{
      serverName: string;
      tool: ToolDefinition;
      fullName: string;
    }> = [];

    const serverStates = this.manager.getAllServerStates();

    for (const state of serverStates) {
      if (
        state.status === ServerStatus.CONNECTED &&
        state.capabilities?.tools
      ) {
        for (const tool of state.capabilities.tools) {
          allTools.push({
            serverName: state.name,
            tool,
            fullName: `${state.name}__${tool.name}`,
          });
        }
      }
    }

    return allTools;
  }

  /**
   * Execute a tool through the MCP client manager
   */
  async executeTool(toolName: string, args: any, serverName?: string) {
    try {
      let result;

      // If serverName is provided, use it directly
      if (serverName) {
        result = await this.manager.callTool(serverName, toolName, args);
      } else {
        // Try to parse serverName from toolName (format: serverName__toolName)
        if (toolName.includes("__")) {
          const [parsedServerName, ...toolNameParts] = toolName.split("__");
          const parsedToolName = toolNameParts.join("__");
          result = await this.manager.callTool(
            parsedServerName,
            parsedToolName,
            args,
          );
        } else {
          // Find which server has this tool
          const serverStates = this.manager.getAllServerStates();
          for (const state of serverStates) {
            if (
              state.status === ServerStatus.CONNECTED &&
              state.capabilities?.tools
            ) {
              const hasTool = state.capabilities.tools.some(
                (t) => t.name === toolName,
              );
              if (hasTool) {
                result = await this.manager.callTool(
                  state.name,
                  toolName,
                  args,
                );
                break;
              }
            }
          }
        }
      }

      if (result === undefined) {
        throw new Error(`Tool ${toolName} not found in any connected server`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get the count of connected servers and available tools
   */
  async getConnectionStats(): Promise<{
    connectedServers: number;
    totalTools: number;
  }> {
    const serverStates = this.manager.getAllServerStates();
    const connectedServers = serverStates.filter(
      (s) => s.status === ServerStatus.CONNECTED,
    );
    const totalTools = connectedServers.reduce(
      (acc, server) => acc + (server.capabilities?.tools?.length || 0),
      0,
    );

    return {
      connectedServers: connectedServers.length,
      totalTools,
    };
  }
}

// Export singleton instance for easy access
export const mcpVoiceClient = new MCPVoiceClient();

// Backward compatibility
export class MCPClient extends MCPVoiceClient {
  constructor() {
    super();
  }
}
