import { mcpVoiceClient } from "@/lib/mcp/client";
import { ToolDefinition } from "@/lib/types/mcp";

export interface MCPToolInfo {
  serverName: string;
  tool: ToolDefinition;
  fullName: string;
}

export interface ConnectionStats {
  connectedServers: number;
  totalTools: number;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * MCP Voice Integration Service
 * Provides a unified interface for voice agents to interact with MCP tools
 */
export class MCPVoiceService {
  private static instance: MCPVoiceService;
  private cachedTools: MCPToolInfo[] = [];
  private cachedStats: ConnectionStats = { connectedServers: 0, totalTools: 0 };
  private lastRefresh: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): MCPVoiceService {
    if (!MCPVoiceService.instance) {
      MCPVoiceService.instance = new MCPVoiceService();
    }
    return MCPVoiceService.instance;
  }

  /**
   * Get all available tools with caching
   */
  async getAvailableTools(forceRefresh = false): Promise<MCPToolInfo[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cachedTools.length > 0 &&
      now - this.lastRefresh < this.CACHE_DURATION
    ) {
      return this.cachedTools;
    }

    try {
      this.cachedTools = await mcpVoiceClient.getAvailableTools();
      this.lastRefresh = now;
      return this.cachedTools;
    } catch (error) {
      console.error("Failed to fetch MCP tools:", error);
      // Return cached tools if available, otherwise empty array
      return this.cachedTools;
    }
  }

  /**
   * Get connection statistics with caching
   */
  async getConnectionStats(forceRefresh = false): Promise<ConnectionStats> {
    const now = Date.now();

    if (!forceRefresh && now - this.lastRefresh < this.CACHE_DURATION) {
      return this.cachedStats;
    }

    try {
      this.cachedStats = await mcpVoiceClient.getConnectionStats();
      return this.cachedStats;
    } catch (error) {
      console.error("Failed to fetch connection stats:", error);
      return this.cachedStats;
    }
  }

  /**
   * Execute a tool with automatic retry logic
   */
  async executeTool(
    toolName: string,
    args: any,
    serverName?: string,
    maxRetries = 1,
  ): Promise<ToolExecutionResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await mcpVoiceClient.executeTool(
          toolName,
          args,
          serverName,
        );

        // If successful, return immediately
        if (result.success) {
          return result;
        }

        // If this is a connection error and we have retries left, continue
        if (result.error?.includes("not connected") && attempt < maxRetries) {
          console.log(
            `Tool execution failed (attempt ${attempt + 1}), retrying...`,
          );
          lastError = result.error;

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Force refresh cache
          await this.getAvailableTools(true);
          continue;
        }

        // Return the error result
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";

        if (attempt < maxRetries) {
          console.log(
            `Tool execution error (attempt ${attempt + 1}), retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError || "Tool execution failed after retries",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert MCP tools to OpenAI function format
   */
  async getOpenAIFunctions(): Promise<
    Array<{
      type: "function";
      function: {
        name: string;
        description?: string;
        parameters?: any;
      };
    }>
  > {
    const tools = await this.getAvailableTools();

    return tools
      .map(({ tool, fullName }) => {
        // Ensure the input schema is properly formatted for OpenAI
        let parameters = tool.inputSchema;

        // If no input schema, provide a minimal valid schema
        if (!parameters || typeof parameters !== "object") {
          parameters = { type: "object", properties: {} };
        }

        // Ensure required properties are present
        if (!parameters.type) {
          parameters.type = "object";
        }
        if (!parameters.properties) {
          parameters.properties = {};
        }

        // Log the tool for debugging
        console.log(`Converting MCP tool ${tool.name} to OpenAI format:`, {
          name: fullName,
          description: tool.description,
          parameters,
        });

        return {
          type: "function" as const,
          function: {
            name: fullName,
            description: tool.description || `Execute ${tool.name} tool`,
            parameters,
          },
        };
      })
      .filter((tool) => {
        // Filter out tools with invalid schemas
        const isValid =
          tool.function.parameters &&
          typeof tool.function.parameters === "object" &&
          tool.function.parameters.type === "object";
        if (!isValid) {
          console.warn(`Filtering out invalid tool: ${tool.function.name}`);
        }
        return isValid;
      });
  }

  /**
   * Get tool by name
   */
  async getToolByName(toolName: string): Promise<MCPToolInfo | null> {
    const tools = await this.getAvailableTools();

    // First try exact match
    let tool = tools.find((t) => t.fullName === toolName);
    if (tool) return tool;

    // Then try without server prefix
    if (toolName.includes("__")) {
      const [, shortName] = toolName.split("__", 2);
      tool = tools.find((t) => t.tool.name === shortName);
      if (tool) return tool;
    }

    // Finally try direct name match
    tool = tools.find((t) => t.tool.name === toolName);
    return tool || null;
  }

  /**
   * Check if a tool is available
   */
  async isToolAvailable(toolName: string): Promise<boolean> {
    const tool = await this.getToolByName(toolName);
    return tool !== null;
  }

  /**
   * Clear cache and force refresh
   */
  async refresh(): Promise<void> {
    this.cachedTools = [];
    this.cachedStats = { connectedServers: 0, totalTools: 0 };
    this.lastRefresh = 0;

    await Promise.all([
      this.getAvailableTools(true),
      this.getConnectionStats(true),
    ]);
  }

  /**
   * Get formatted tool list for display
   */
  async getFormattedToolList(): Promise<string> {
    const tools = await this.getAvailableTools();
    const stats = await this.getConnectionStats();

    if (tools.length === 0) {
      return "No MCP tools available.";
    }

    const toolNames = tools.map((t) => t.fullName).join(", ");
    return `${stats.totalTools} tools available: ${toolNames}`;
  }
}

// Export singleton instance
export const mcpVoiceService = MCPVoiceService.getInstance();
