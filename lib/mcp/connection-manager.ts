import { EventEmitter } from "events";

interface ConnectionHealth {
  serverName: string;
  lastActivity: number;
  failureCount: number;
  isHealthy: boolean;
  lastError?: string;
}

/**
 * Manages MCP server connections with health monitoring and auto-recovery
 */
export class ConnectionManager extends EventEmitter {
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private reconnectQueue: Set<string> = new Set();
  private reconnectAttempts: Map<string, number> = new Map();

  // Configuration
  private readonly maxFailures = 3;
  private readonly healthCheckIntervalMs = 60000; // 60 seconds
  private readonly connectionTimeoutMs = 300000; // 5 minutes - MCP servers can be idle for a while
  private readonly maxReconnectAttempts = 3; // Reduce reconnect attempts
  private readonly reconnectDelayMs = 10000; // 10 seconds base delay

  constructor() {
    super();
    // Disable health monitoring - it's too aggressive and causes unnecessary reconnections
    // this.startHealthMonitoring();
  }

  /**
   * Register a server connection for monitoring
   */
  registerConnection(serverName: string): void {
    this.connectionHealth.set(serverName, {
      serverName,
      lastActivity: Date.now(),
      failureCount: 0,
      isHealthy: true,
    });
    this.reconnectAttempts.set(serverName, 0);
  }

  /**
   * Update connection activity
   */
  updateActivity(serverName: string): void {
    const health = this.connectionHealth.get(serverName);
    if (health) {
      health.lastActivity = Date.now();
      health.isHealthy = true;
      health.failureCount = 0;
      this.connectionHealth.set(serverName, health);
    }
  }

  /**
   * Record connection failure
   */
  recordFailure(serverName: string, error?: string): void {
    const health = this.connectionHealth.get(serverName);
    if (health) {
      health.failureCount++;
      health.lastError = error;
      health.isHealthy = health.failureCount < this.maxFailures;
      this.connectionHealth.set(serverName, health);

      if (!health.isHealthy) {
        this.scheduleReconnect(serverName);
      }
    }
  }

  /**
   * Schedule reconnection for unhealthy connection
   */
  private scheduleReconnect(serverName: string): void {
    if (this.reconnectQueue.has(serverName)) {
      return; // Already scheduled
    }

    const attempts = this.reconnectAttempts.get(serverName) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for ${serverName}`);
      this.emit("connection-failed", serverName);
      return;
    }

    this.reconnectQueue.add(serverName);
    const delay = this.reconnectDelayMs * 2 ** attempts; // Exponential backoff

    console.log(
      `Scheduling reconnect for ${serverName} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.reconnectQueue.delete(serverName);
      this.reconnectAttempts.set(serverName, attempts + 1);
      this.emit("reconnect-required", serverName);
    }, delay);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Check health of all connections
   */
  private checkConnectionHealth(): void {
    const now = Date.now();

    for (const [serverName, health] of this.connectionHealth.entries()) {
      const timeSinceActivity = now - health.lastActivity;

      // Only warn about timeout, don't trigger reconnect unless there are actual failures
      if (timeSinceActivity > this.connectionTimeoutMs) {
        console.info(
          `Connection idle for ${serverName} (${Math.round(timeSinceActivity / 1000)}s since last activity)`,
        );
        // Don't record as failure - MCP servers can be idle
        // this.recordFailure(serverName, 'Connection timeout');
      }

      // Emit health status
      this.emit("health-check", {
        serverName,
        isHealthy: health.isHealthy,
        lastActivity: health.lastActivity,
        failureCount: health.failureCount,
      });
    }
  }

  /**
   * Reset connection health
   */
  resetConnection(serverName: string): void {
    this.connectionHealth.set(serverName, {
      serverName,
      lastActivity: Date.now(),
      failureCount: 0,
      isHealthy: true,
    });
    this.reconnectAttempts.set(serverName, 0);
    this.reconnectQueue.delete(serverName);
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(serverName: string): ConnectionHealth | undefined {
    return this.connectionHealth.get(serverName);
  }

  /**
   * Get all connection health statuses
   */
  getAllConnectionHealth(): ConnectionHealth[] {
    return Array.from(this.connectionHealth.values());
  }

  /**
   * Check if connection is healthy
   */
  isHealthy(serverName: string): boolean {
    const health = this.connectionHealth.get(serverName);
    return health?.isHealthy ?? false;
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.connectionHealth.clear();
    this.reconnectQueue.clear();
    this.reconnectAttempts.clear();
  }
}
