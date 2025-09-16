import { type NextRequest, NextResponse } from "next/server";
import { getGlobalClientManager } from "@/lib/mcp/global-client-manager";

export async function GET(request: NextRequest) {
  try {
    const manager = getGlobalClientManager();
    const allTools = manager.getAllTools();
    const serverStates = manager.getAllServerStates();

    console.log("[API] Getting MCP tools for voice agent");
    console.log("[API] Connected servers:", serverStates.filter(s => s.status === "connected").length);
    console.log("[API] Total tools available:", allTools.length);

    // Format tools for OpenAI Realtime
    const formattedTools = allTools.map(({ serverName, tool }) => {
      // Ensure the input schema is properly formatted
      let parameters = tool.inputSchema || {
        type: "object",
        properties: {},
        required: [],
      };

      // Make sure the schema has the correct structure
      if (!parameters.type) {
        parameters = { ...parameters, type: "object" };
      }
      if (!parameters.properties) {
        parameters = { ...parameters, properties: {} };
      }

      return {
        type: "function",
        name: `${serverName}__${tool.name}`,
        description: tool.description || `Tool ${tool.name} from ${serverName}`,
        parameters: parameters,
      };
    });

    // Get server information for the greeting
    const connectedServers = serverStates.filter(s => s.status === "connected");
    const serverDescriptions = connectedServers.map(s => {
      const toolCount = s.capabilities?.tools?.length || 0;
      return `${s.name} (${toolCount} tools)`;
    }).join(", ");

    return NextResponse.json({
      tools: formattedTools,
      totalTools: formattedTools.length,
      serverDescriptions,
      connectedServers: connectedServers.map(s => ({
        name: s.name,
        toolCount: s.capabilities?.tools?.length || 0
      }))
    });
  } catch (error) {
    console.error("[API] Error getting MCP tools:", error);
    return NextResponse.json(
      { error: "Failed to get MCP tools", tools: [], totalTools: 0 },
      { status: 500 }
    );
  }
}