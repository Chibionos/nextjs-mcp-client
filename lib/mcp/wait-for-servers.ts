import { ServerStatus } from "@/lib/types/mcp";
import { getGlobalClientManager } from "./global-client-manager";

/**
 * Wait for all servers to be ready (connected or failed)
 */
export async function waitForServers(timeoutMs: number = 10000): Promise<void> {
  const manager = getGlobalClientManager();
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const serverStates = manager.getAllServerStates();

    // If no servers, return immediately
    if (serverStates.length === 0) {
      return;
    }

    // Check if all servers are in a final state
    const allReady = serverStates.every(
      (state) =>
        state.status === ServerStatus.CONNECTED ||
        state.status === ServerStatus.ERROR ||
        state.status === ServerStatus.DISCONNECTED,
    );

    if (allReady) {
      return;
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.warn("Timeout waiting for servers to be ready");
}

/**
 * Ensure servers are connected before proceeding
 */
export async function ensureServersConnected(): Promise<number> {
  const manager = getGlobalClientManager();

  // Wait for servers to be ready
  await waitForServers();

  // Get connected servers
  const serverStates = manager.getAllServerStates();
  const connectedServers = serverStates.filter(
    (s) => s.status === ServerStatus.CONNECTED,
  );

  console.log(
    `Connected servers: ${connectedServers.length}/${serverStates.length}`,
  );

  return connectedServers.length;
}
