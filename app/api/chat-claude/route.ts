import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { getGlobalClientManager } from "@/lib/mcp/global-client-manager";
import { ChatMessage } from "@/lib/types/mcp";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ToolUse {
  id: string;
  name: string;
  input: any;
}

async function executeToolCalls(manager: any, content: any[]): Promise<any[]> {
  const toolResults = [];

  for (const block of content) {
    if (block.type === "tool_use") {
      const toolUse = block as any;
      console.log(`Executing tool: ${toolUse.name} with input:`, toolUse.input);

      try {
        // Parse server name and tool name
        const [serverName, ...toolNameParts] = toolUse.name.split("__");
        const toolName = toolNameParts.join("__");

        // Call the tool through MCP
        const result = await manager.callTool(
          serverName,
          toolName,
          toolUse.input,
        );
        console.log(
          `Tool ${toolUse.name} result:`,
          JSON.stringify(result).substring(0, 500) + "...",
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        });
      } catch (error) {
        console.error(`Tool ${toolUse.name} error:`, error);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${error instanceof Error ? error.message : "Tool execution failed"}`,
          is_error: true,
        });
      }
    }
  }

  return toolResults;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = "claude-sonnet-4-20250514" } =
      await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 },
      );
    }

    const manager = getGlobalClientManager();

    // Debug: Check server states
    const serverStates = manager.getAllServerStates();
    console.log(
      "Server states:",
      serverStates.map((s) => ({
        name: s.name,
        status: s.status,
        toolCount: s.capabilities?.tools?.length || 0,
      })),
    );

    const allTools = manager.getAllTools();

    console.log("Available tools from MCP servers:", allTools.length);
    console.log(
      "Tools:",
      allTools.map((t) => `${t.serverName}__${t.tool.name}`),
    );

    // Convert MCP tools to Claude tool format
    const claudeTools = allTools.map(({ serverName, tool }) => ({
      name: `${serverName}__${tool.name}`,
      description: tool.description || `Tool ${tool.name} from ${serverName}`,
      input_schema: tool.inputSchema || {
        type: "object",
        properties: {},
        required: [],
      },
    }));

    // Convert messages to Claude format with proper typing
    const claudeMessages = messages.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }));

    // Add system message if tools are available
    const systemMessage =
      claudeTools.length > 0
        ? `You have access to ${claudeTools.length} tools from MCP servers. When users ask questions that require current information, web searches, or data extraction, use the appropriate tools to get real, up-to-date results. Don't describe what you would search for - actually perform the search using the tools.`
        : undefined;

    // Create message with tools
    console.log("Sending request to Claude with:", {
      model,
      messageCount: claudeMessages.length,
      toolCount: claudeTools.length,
      hasSystem: !!systemMessage,
    });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: claudeMessages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      system: systemMessage,
    });

    console.log("Claude response:", {
      stop_reason: response.stop_reason,
      content_types: response.content.map((b) => b.type),
      usage: response.usage,
      full_content: JSON.stringify(response.content, null, 2),
    });

    // Handle tool use with support for multiple rounds
    let currentResponse = response;
    let allToolCalls: any[] = [];
    let allToolResults: any[] = [];
    const conversationMessages: any[] = [...claudeMessages];
    const maxRounds = 5; // Prevent infinite loops
    let round = 0;

    while (
      (currentResponse.stop_reason === "tool_use" ||
        currentResponse.content.some((block) => block.type === "tool_use")) &&
      round < maxRounds
    ) {
      console.log(`Tool use detected (round ${round + 1}), executing tools...`);

      // Execute tool calls for this round
      const toolResults = await executeToolCalls(
        manager,
        currentResponse.content,
      );

      // Collect all tool calls and results
      const toolCallsThisRound = currentResponse.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          id: (b as any).id,
          name: (b as any).name,
          arguments: (b as any).input,
        }));

      allToolCalls = [...allToolCalls, ...toolCallsThisRound];
      allToolResults = [...allToolResults, ...toolResults];

      // Update conversation with assistant response and tool results
      conversationMessages.push(
        { role: "assistant", content: currentResponse.content },
        { role: "user", content: toolResults },
      );

      // Get next response
      console.log(
        `Getting response after tool execution (round ${round + 1})...`,
      );
      currentResponse = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        messages: conversationMessages,
        tools: claudeTools.length > 0 ? claudeTools : undefined,
        system: systemMessage,
      });

      console.log(`Response after round ${round + 1}:`, {
        stop_reason: currentResponse.stop_reason,
        content_types: currentResponse.content.map((b) => b.type),
        has_more_tools: currentResponse.content.some(
          (b) => b.type === "tool_use",
        ),
      });

      round++;
    }

    // Extract final text content
    const textContent = currentResponse.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n");

    console.log("Final text content after all tool calls:", textContent);

    if (allToolCalls.length > 0) {
      return NextResponse.json({
        message: {
          role: "assistant",
          content:
            textContent ||
            "I searched for information but couldn't generate a response. Please try rephrasing your question.",
        },
        toolCalls: allToolCalls,
        toolResults: allToolResults.map((r) => ({
          tool_use_id: r.tool_use_id,
          content: r.content.substring(0, 1000), // Limit content size for UI
          is_error: r.is_error,
        })),
      });
    }

    // No tool use - extract text content from the response
    const finalTextContent = currentResponse.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n");

    return NextResponse.json({
      message: {
        role: "assistant",
        content: finalTextContent,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
