import { type NextRequest, NextResponse } from "next/server";
import { getGlobalClientManager } from "@/lib/mcp/global-client-manager";
import type { MCPServerConfig } from "@/lib/types/mcp";

export async function POST(request: NextRequest) {
  try {
    const { name, config } = (await request.json()) as {
      name: string;
      config: MCPServerConfig;
    };

    if (!name || !config) {
      return NextResponse.json(
        { error: "Server name and configuration are required" },
        { status: 400 },
      );
    }

    const manager = getGlobalClientManager();

    // Connect to the server with proper error handling
    const serverState = await manager.connectServer(name, config, {
      onStatusChange: (status) => {
        console.log(`Server ${name} status changed to:`, status);
      },
      onError: (error) => {
        console.error(`Server ${name} error:`, error);
      },
    });

    return NextResponse.json({
      success: true,
      server: serverState,
    });
  } catch (error) {
    console.error("Failed to connect to MCP server:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to server",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Server name is required" },
        { status: 400 },
      );
    }

    const manager = getGlobalClientManager();
    await manager.disconnectServer(name);

    return NextResponse.json({
      success: true,
      message: `Server ${name} disconnected successfully`,
    });
  } catch (error) {
    console.error("Failed to disconnect MCP server:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect server",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { name } = (await request.json()) as { name: string };

    if (!name) {
      return NextResponse.json(
        { error: "Server name is required" },
        { status: 400 },
      );
    }

    const manager = getGlobalClientManager();
    const serverState = await manager.reconnectServer(name);

    return NextResponse.json({
      success: true,
      server: serverState,
    });
  } catch (error) {
    console.error("Failed to reconnect MCP server:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reconnect server",
      },
      { status: 500 },
    );
  }
}
