import { z } from 'zod';

// MCP Server Configuration Schema
export const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// MCP Configuration Schema (similar to Claude Desktop)
export const MCPConfigurationSchema = z.object({
  mcpServers: z.record(MCPServerConfigSchema),
});

export type MCPConfiguration = z.infer<typeof MCPConfigurationSchema>;

// Server Status
export enum ServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  PERMISSION_REQUIRED = 'permission_required',
}

// Server State
export interface ServerState {
  name: string;
  config: MCPServerConfig;
  status: ServerStatus;
  error?: string;
  capabilities?: ServerCapabilities;
  permissionsGranted?: string[];
  permissionsRequired?: string[];
}

// Server Capabilities
export interface ServerCapabilities {
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  prompts?: PromptDefinition[];
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: any;
}

// Resource Definition
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Prompt Definition
export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// Chat Message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// Tool Call
export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  serverName: string;
}

// Tool Result
export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

// Permission Request
export interface PermissionRequest {
  serverName: string;
  permissions: string[];
  reason?: string;
}

// Transport Type
export enum TransportType {
  STDIO = 'stdio',
  HTTP = 'http',
  SSE = 'sse',
}

// MCP Client Options
export interface MCPClientOptions {
  transportType: TransportType;
  config: MCPServerConfig;
  onStatusChange?: (status: ServerStatus) => void;
  onPermissionRequest?: (request: PermissionRequest) => Promise<boolean>;
}