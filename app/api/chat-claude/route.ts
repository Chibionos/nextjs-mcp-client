import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getGlobalClientManager } from '@/lib/mcp/global-client-manager';
import { ChatMessage } from '@/lib/types/mcp';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ToolUse {
  id: string;
  name: string;
  input: any;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'claude-sonnet-4-20250514' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const manager = getGlobalClientManager();
    
    // Debug: Check server states
    const serverStates = manager.getAllServerStates();
    console.log('Server states:', serverStates.map(s => ({
      name: s.name,
      status: s.status,
      toolCount: s.capabilities?.tools?.length || 0
    })));
    
    const allTools = manager.getAllTools();
    
    console.log('Available tools from MCP servers:', allTools.length);
    console.log('Tools:', allTools.map(t => `${t.serverName}__${t.tool.name}`));
    
    // Convert MCP tools to Claude tool format
    const claudeTools = allTools.map(({ serverName, tool }) => ({
      name: `${serverName}__${tool.name}`,
      description: tool.description || `Tool ${tool.name} from ${serverName}`,
      input_schema: tool.inputSchema || {
        type: 'object',
        properties: {},
        required: []
      },
    }))

    // Convert messages to Claude format with proper typing
    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    // Add system message if tools are available
    const systemMessage = claudeTools.length > 0 
      ? `You have access to ${claudeTools.length} tools from MCP servers. When users ask questions that require current information, web searches, or data extraction, use the appropriate tools to get real, up-to-date results. Don't describe what you would search for - actually perform the search using the tools.`
      : undefined;

    // Create message with tools
    console.log('Sending request to Claude with:', {
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

    console.log('Claude response:', {
      stop_reason: response.stop_reason,
      content_types: response.content.map(b => b.type),
      usage: response.usage,
      full_content: JSON.stringify(response.content, null, 2)
    });

    // Handle tool use
    if (response.stop_reason === 'tool_use' || response.content.some(block => block.type === 'tool_use')) {
      console.log('Tool use detected, executing tools...');
      const toolResults = [];
      
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const toolUse = block as any;
          console.log(`Executing tool: ${toolUse.name} with input:`, toolUse.input);
          
          try {
            // Parse server name and tool name
            const [serverName, ...toolNameParts] = toolUse.name.split('__');
            const toolName = toolNameParts.join('__');
            
            // Call the tool through MCP
            const result = await manager.callTool(serverName, toolName, toolUse.input);
            console.log(`Tool ${toolUse.name} result:`, result);
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            });
          } catch (error) {
            console.error(`Tool ${toolUse.name} error:`, error);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
              is_error: true,
            });
          }
        }
      }

      // Get final response with tool results
      const finalResponse = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });

      // Extract text content from the response
      const textContent = finalResponse.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return NextResponse.json({
        message: {
          role: 'assistant',
          content: textContent,
        },
        toolCalls: response.content.filter(b => b.type === 'tool_use'),
        toolResults,
      });
    }

    // Extract text content from the response
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: textContent,
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}