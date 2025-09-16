import { type NextRequest, NextResponse } from "next/server";
import { mcpVoiceClient } from "@/lib/mcp/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, arguments: toolArgs, serverName } = body;

    console.log(
      "Executing tool:",
      toolName,
      "with args:",
      toolArgs,
      "on server:",
      serverName,
    );

    // Use the MCP voice client for consistency
    const result = await mcpVoiceClient.executeTool(
      toolName,
      toolArgs,
      serverName,
    );

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Error executing tool:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute tool",
      },
      { status: 500 },
    );
  }
}
