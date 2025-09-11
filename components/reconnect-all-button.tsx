'use client';

import { useState } from 'react';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { RefreshCw } from 'lucide-react';
import { ServerStatus } from '@/lib/types/mcp';
import { Button } from '@/components/ui/button';

export function ReconnectAllButton() {
  const { servers, updateServerStatus, addServer } = useMCPStore();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnectAll = async () => {
    setIsReconnecting(true);

    const disconnectedServers = servers.filter(
      s => s.status === ServerStatus.DISCONNECTED || s.status === ServerStatus.ERROR
    );

    try {
      // Connect all disconnected servers in parallel
      const promises = disconnectedServers.map(async (server) => {
        updateServerStatus(server.name, ServerStatus.CONNECTING);
        
        try {
          const response = await fetch('/api/mcp/connect-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: server.name,
              config: server.config,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addServer(data.server);
            return { success: true, name: server.name };
          } else {
            updateServerStatus(server.name, ServerStatus.ERROR, 'Failed to connect');
            return { success: false, name: server.name };
          }
        } catch (err) {
          updateServerStatus(server.name, ServerStatus.ERROR, 'Connection error');
          return { success: false, name: server.name };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`Reconnected ${successCount} servers, ${failCount} failed`);
    } finally {
      setIsReconnecting(false);
    }
  };

  const disconnectedCount = servers.filter(
    s => s.status === ServerStatus.DISCONNECTED || s.status === ServerStatus.ERROR
  ).length;

  if (disconnectedCount === 0) {
    return null;
  }

  return (
    <Button
      onClick={handleReconnectAll}
      disabled={isReconnecting}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isReconnecting ? 'animate-spin' : ''}`} />
      {isReconnecting 
        ? 'Reconnecting...' 
        : `Reconnect All (${disconnectedCount})`
      }
    </Button>
  );
}