/**
 * MCP Error Handler for graceful error recovery
 */

export enum ErrorType {
  SSE_TIMEOUT = 'SSE_TIMEOUT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  UNKNOWN = 'UNKNOWN',
}

export interface MCPError {
  type: ErrorType;
  message: string;
  serverName?: string;
  originalError?: any;
  isRecoverable: boolean;
  suggestedAction?: string;
}

export class ErrorHandler {
  /**
   * Classify and wrap errors for better handling
   */
  static classifyError(error: any, serverName?: string): MCPError {
    const errorString = error?.toString() || '';
    const errorMessage = error?.message || errorString;

    // SSE Timeout errors
    if (
      errorString.includes('Body Timeout Error') ||
      errorString.includes('SSE error') ||
      errorString.includes('terminated') ||
      errorMessage.includes('timeout')
    ) {
      return {
        type: ErrorType.SSE_TIMEOUT,
        message: 'Connection timeout - will automatically reconnect',
        serverName,
        originalError: error,
        isRecoverable: true,
        suggestedAction: 'Automatic reconnection in progress',
      };
    }

    // Connection errors
    if (
      errorString.includes('ECONNREFUSED') ||
      errorString.includes('ECONNRESET') ||
      errorString.includes('Connection closed') ||
      errorMessage.includes('not connected')
    ) {
      return {
        type: ErrorType.CONNECTION_LOST,
        message: 'Connection lost to MCP server',
        serverName,
        originalError: error,
        isRecoverable: true,
        suggestedAction: 'Attempting to reconnect',
      };
    }

    // Authentication errors
    if (
      errorString.includes('401') ||
      errorString.includes('403') ||
      errorString.includes('Unauthorized') ||
      errorMessage.includes('authentication')
    ) {
      return {
        type: ErrorType.AUTH_REQUIRED,
        message: 'Authentication required',
        serverName,
        originalError: error,
        isRecoverable: true,
        suggestedAction: 'Please authenticate to continue',
      };
    }

    // Tool execution errors
    if (
      errorString.includes('Tool execution failed') ||
      errorString.includes('Method not found') ||
      error?.code === -32601
    ) {
      // Method not found is often okay (server doesn't support the method)
      if (error?.code === -32601) {
        return {
          type: ErrorType.TOOL_EXECUTION,
          message: 'Method not supported by server',
          serverName,
          originalError: error,
          isRecoverable: false,
          suggestedAction: 'This is expected - server does not support this method',
        };
      }

      return {
        type: ErrorType.TOOL_EXECUTION,
        message: 'Tool execution failed',
        serverName,
        originalError: error,
        isRecoverable: false,
        suggestedAction: 'Check tool parameters and try again',
      };
    }

    // Unknown errors
    return {
      type: ErrorType.UNKNOWN,
      message: errorMessage || 'Unknown error occurred',
      serverName,
      originalError: error,
      isRecoverable: false,
    };
  }

  /**
   * Check if error should trigger reconnection
   */
  static shouldReconnect(error: MCPError): boolean {
    return (
      error.isRecoverable &&
      (error.type === ErrorType.SSE_TIMEOUT ||
        error.type === ErrorType.CONNECTION_LOST)
    );
  }

  /**
   * Check if error should be logged as warning vs error
   */
  static isExpectedError(error: MCPError): boolean {
    return (
      error.type === ErrorType.TOOL_EXECUTION &&
      error.originalError?.code === -32601 // Method not found
    );
  }

  /**
   * Format error for user display
   */
  static formatForUser(error: MCPError): string {
    if (error.suggestedAction) {
      return `${error.message}. ${error.suggestedAction}`;
    }
    return error.message;
  }

  /**
   * Log error appropriately
   */
  static logError(error: MCPError): void {
    if (this.isExpectedError(error)) {
      // Log as debug for expected errors (like method not found)
      console.debug(`[MCP] ${error.serverName || 'Unknown'}: ${error.message}`);
    } else if (error.type === ErrorType.SSE_TIMEOUT) {
      // Log SSE timeouts as info - they're common and handled automatically
      console.info(`[MCP] ${error.serverName || 'Unknown'}: SSE connection idle, will reconnect if needed`);
    } else if (error.isRecoverable) {
      // Log as warning for other recoverable errors
      console.warn(`[MCP] ${error.serverName || 'Unknown'}: ${error.message}`);
    } else {
      // Log as error for non-recoverable errors
      console.error(`[MCP] ${error.serverName || 'Unknown'}: ${error.message}`, error.originalError);
    }
  }
}