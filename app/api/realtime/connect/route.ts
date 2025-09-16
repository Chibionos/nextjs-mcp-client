import { type NextRequest, NextResponse } from "next/server";
import { getGlobalClientManager } from "@/lib/mcp/global-client-manager";

export async function POST(request: NextRequest) {
  try {
    // Get API key from server-side environment (secure)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured on server" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { sdp, includeTools = true } = body;

    if (!sdp) {
      return NextResponse.json({ error: "SDP is required" }, { status: 400 });
    }

    // Get available MCP tools if requested
    let queryParams = "model=gpt-4o-realtime-preview";

    if (includeTools) {
      const manager = getGlobalClientManager();
      const allTools = manager.getAllTools();

      console.log("[Realtime API] Available MCP tools:", allTools.length);

      // Note: OpenAI Realtime doesn't support tools in the query params
      // Tools must be configured via session.update after connection
      // This is a limitation of the WebRTC API
    }

    // Connect to OpenAI Realtime API
    const realtimeResponse = await fetch(
      `https://api.openai.com/v1/realtime?${queryParams}`,
      {
        method: "POST",
        body: sdp,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/sdp",
        },
      },
    );

    if (!realtimeResponse.ok) {
      const errorText = await realtimeResponse.text();
      console.error("OpenAI Realtime API error:", errorText);
      return NextResponse.json(
        {
          error: "Failed to connect to Realtime API",
          details: errorText,
        },
        { status: realtimeResponse.status },
      );
    }

    const answer = await realtimeResponse.text();

    return new NextResponse(answer, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    console.error("Error connecting to Realtime API:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to Realtime API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
