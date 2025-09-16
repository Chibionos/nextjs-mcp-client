import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_INSTRUCTIONS = `You are a helpful assistant with access to MCP (Model Context Protocol) tools.
When users ask you to perform tasks, check if there's an appropriate tool available and use it.
Be conversational and friendly. Speak naturally and concisely.

You have access to various MCP tools that can help with:
- Web scraping and content extraction
- File operations and code analysis
- API interactions
- Data processing
- And many other tasks

Always use the appropriate tool when the user asks for something that can be accomplished with the available tools.
When calling tools, use the format: serverName__toolName (e.g., mcp-server-firecrawl__firecrawl_scrape).`;

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
    const { action } = body;

    if (action === "create_session") {
      // Create a realtime session using OpenAI SDK on the server side
      const sessionConfig = {
        model: "gpt-realtime",
        instructions: DEFAULT_INSTRUCTIONS,
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [],
        tool_choice: "auto",
        temperature: 0.8,
        max_response_output_tokens: 4096,
      };

      console.log("Created realtime session config on server");

      return NextResponse.json({
        session: sessionConfig,
        message: "Session configuration created successfully",
      });
    }

    if (action === "create_webrtc_offer") {
      // This would handle WebRTC offer creation in the future
      // For now, return a placeholder
      return NextResponse.json({
        offer: {
          type: "offer",
          sdp: "placeholder_sdp",
        },
        message: "WebRTC offer created",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      {
        error: "Failed to create realtime session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Keep GET method for backward compatibility
export async function GET(request: NextRequest) {
  try {
    // Get API key from server-side environment (secure)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured on server" },
        { status: 500 },
      );
    }

    const sessionConfig = {
      model: "gpt-realtime",
      instructions: DEFAULT_INSTRUCTIONS,
      voice: "alloy",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: {
        model: "whisper-1",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      tools: [],
      tool_choice: "auto",
      temperature: 0.8,
      max_response_output_tokens: 4096,
    };

    console.log("Created realtime session config on server");

    return NextResponse.json({
      session: sessionConfig,
      message: "Session configuration created successfully",
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      {
        error: "Failed to create realtime session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
