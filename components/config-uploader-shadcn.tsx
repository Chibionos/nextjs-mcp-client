'use client';

import { useState, useRef } from 'react';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { MCPConfiguration, MCPConfigurationSchema, ServerStatus } from '@/lib/types/mcp';
import { Upload, FileJson, AlertCircle, CheckCircle, Download, FileCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ConfigUploaderShadcn() {
  const { 
    configuration, 
    setConfiguration, 
    addServer, 
    updateServerStatus 
  } = useMCPStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON configuration file');
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Validate configuration
      const config = MCPConfigurationSchema.parse(json);
      
      // Set configuration
      setConfiguration(config);
      
      // Add servers to the store
      Object.entries(config.mcpServers).forEach(([name, serverConfig]) => {
        addServer({
          name,
          config: serverConfig,
          status: ServerStatus.DISCONNECTED,
        });
      });

      toast.success(`Configuration loaded! ${Object.keys(config.mcpServers).length} servers added.`);
      
      // Auto-connect servers after a short delay
      setTimeout(() => {
        Object.keys(config.mcpServers).forEach(async (name) => {
          try {
            updateServerStatus(name, ServerStatus.CONNECTING);
            
            const response = await fetch('/api/mcp/connect-v2', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name,
                config: config.mcpServers[name],
              }),
            });

            if (response.ok) {
              const data = await response.json();
              addServer(data.server);
              toast.success(`Connected to ${name}`);
            } else {
              updateServerStatus(name, ServerStatus.ERROR, 'Failed to connect');
              toast.error(`Failed to connect to ${name}`);
            }
          } catch (err) {
            updateServerStatus(name, ServerStatus.ERROR, 'Connection error');
            toast.error(`Connection error for ${name}`);
          }
        });
      }, 500);

    } catch (err) {
      console.error('Failed to parse configuration:', err);
      if (err instanceof Error) {
        toast.error(`Invalid configuration: ${err.message}`);
      } else {
        toast.error('Invalid configuration file');
      }
    }
  };

  const downloadSampleConfig = () => {
    const sampleConfig: MCPConfiguration = {
      mcpServers: {
        "filesystem": {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "/path/to/allowed/directory"
          ]
        },
        "github": {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-github"
          ],
          env: {
            "GITHUB_TOKEN": "your-github-token"
          }
        }
      }
    };

    const blob = new Blob([JSON.stringify(sampleConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp-config-sample.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-4 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center gap-3">
          <FileJson className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">MCP Configuration</p>
            <p className="text-xs text-muted-foreground">
              Drop JSON file or browse
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <Upload className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {configuration && (
          <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">
                {Object.keys(configuration.mcpServers).length} servers loaded
              </span>
            </div>
          </div>
        )}
        <Button
          onClick={downloadSampleConfig}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          Sample
        </Button>
      </div>
    </div>
  );
}