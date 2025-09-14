import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { EventEmitter } from 'events';

/**
 * Enhanced SSE Transport with keep-alive and reconnection
 */
export class EnhancedSSETransport extends EventEmitter {
  private transport: SSEClientTransport | null = null;
  private url: URL;
  private headers: Record<string, string>;
  private keepAliveInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private keepAliveIntervalMs: number = 30000; // 30 seconds
  private connectionTimeout: number = 60000; // 60 seconds
  private lastActivity: number = Date.now();

  constructor(url: URL, headers?: Record<string, string>) {
    super();
    this.url = url;
    this.headers = headers || {};
  }

  /**
   * Connect with enhanced error handling and keep-alive
   */
  async connect(): Promise<SSEClientTransport> {
    try {
      // Clear any existing connection
      this.cleanup();

      // Create new transport with headers
      this.transport = new SSEClientTransport(this.url, {
        headers: this.headers
      });
      
      // Start monitoring
      this.startKeepAlive();
      this.startConnectionMonitor();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastActivity = Date.now();
      
      // Wrap original methods to track activity
      this.wrapTransportMethods();
      
      return this.transport;
    } catch (error) {
      console.error('Failed to create SSE transport:', error);
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Wrap transport methods to track activity
   */
  private wrapTransportMethods(): void {
    if (!this.transport) return;

    const originalSend = this.transport.send?.bind(this.transport);
    const originalReceive = this.transport.receive?.bind(this.transport);

    if (originalSend) {
      // @ts-ignore
      this.transport.send = async (...args: any[]) => {
        this.lastActivity = Date.now();
        return originalSend(...args);
      };
    }

    if (originalReceive) {
      // @ts-ignore
      this.transport.receive = async (...args: any[]) => {
        this.lastActivity = Date.now();
        return originalReceive(...args);
      };
    }
  }

  /**
   * Start keep-alive ping mechanism
   */
  private startKeepAlive(): void {
    // Clear existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Send keep-alive pings
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.transport) {
        try {
          // Send a ping message or no-op to keep connection alive
          this.lastActivity = Date.now();
          this.emit('keepalive');
        } catch (error) {
          console.warn('Keep-alive ping failed:', error);
        }
      }
    }, this.keepAliveIntervalMs);
  }

  /**
   * Monitor connection for timeouts
   */
  private startConnectionMonitor(): void {
    const checkConnection = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;

      if (timeSinceLastActivity > this.connectionTimeout) {
        console.warn('Connection timeout detected, attempting reconnect...');
        this.handleConnectionTimeout();
      } else if (this.isConnected) {
        // Schedule next check
        setTimeout(checkConnection, 10000); // Check every 10 seconds
      }
    };

    // Start monitoring
    setTimeout(checkConnection, 10000);
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(): void {
    this.isConnected = false;
    this.emit('timeout');
    this.reconnect();
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    console.error('SSE connection error:', error);
    this.isConnected = false;
    this.emit('error', error);
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnect();
    } else {
      this.emit('max_reconnect_exceeded');
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already reconnecting
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = undefined;
      
      try {
        await this.connect();
        console.log('Reconnection successful');
        this.emit('reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleConnectionError(error);
      }
    }, delay);
  }

  /**
   * Get the underlying transport
   */
  getTransport(): SSEClientTransport | null {
    return this.transport;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    this.cleanup();
    
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('Error closing transport:', error);
      }
      this.transport = null;
    }
    
    this.isConnected = false;
    this.emit('closed');
  }

  /**
   * Cleanup timers and listeners
   */
  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Update activity timestamp
   */
  updateActivity(): void {
    this.lastActivity = Date.now();
  }
}