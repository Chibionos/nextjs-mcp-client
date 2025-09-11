import { create } from 'zustand';
import { 
  MCPConfiguration, 
  ServerState, 
  ChatMessage, 
  PermissionRequest,
  ServerStatus 
} from '@/lib/types/mcp';

interface MCPStore {
  // Configuration
  configuration: MCPConfiguration | null;
  setConfiguration: (config: MCPConfiguration) => void;
  
  // Servers
  servers: ServerState[];
  addServer: (server: ServerState) => void;
  updateServerStatus: (name: string, status: ServerStatus, error?: string) => void;
  removeServer: (name: string) => void;
  getServer: (name: string) => ServerState | undefined;
  
  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  
  // Permissions
  pendingPermissions: PermissionRequest[];
  addPermissionRequest: (request: PermissionRequest) => void;
  removePermissionRequest: (serverName: string) => void;
  grantPermissions: (serverName: string, permissions: string[]) => void;
  
  // UI State
  isConfigModalOpen: boolean;
  setConfigModalOpen: (open: boolean) => void;
  selectedServer: string | null;
  setSelectedServer: (name: string | null) => void;
  isChatLoading: boolean;
  setChatLoading: (loading: boolean) => void;
}

export const useMCPStore = create<MCPStore>((set, get) => ({
  // Configuration
  configuration: null,
  setConfiguration: (config) => set({ configuration: config }),
  
  // Servers
  servers: [],
  addServer: (server) => set((state) => ({
    servers: [...state.servers.filter(s => s.name !== server.name), server]
  })),
  updateServerStatus: (name, status, error) => set((state) => ({
    servers: state.servers.map(s => 
      s.name === name 
        ? { ...s, status, error }
        : s
    )
  })),
  removeServer: (name) => set((state) => ({
    servers: state.servers.filter(s => s.name !== name)
  })),
  getServer: (name) => get().servers.find(s => s.name === name),
  
  // Chat
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  clearMessages: () => set({ messages: [] }),
  
  // Permissions
  pendingPermissions: [],
  addPermissionRequest: (request) => set((state) => ({
    pendingPermissions: [...state.pendingPermissions, request]
  })),
  removePermissionRequest: (serverName) => set((state) => ({
    pendingPermissions: state.pendingPermissions.filter(p => p.serverName !== serverName)
  })),
  grantPermissions: (serverName, permissions) => set((state) => ({
    servers: state.servers.map(s => 
      s.name === serverName 
        ? { ...s, permissionsGranted: permissions }
        : s
    ),
    pendingPermissions: state.pendingPermissions.filter(p => p.serverName !== serverName)
  })),
  
  // UI State
  isConfigModalOpen: false,
  setConfigModalOpen: (open) => set({ isConfigModalOpen: open }),
  selectedServer: null,
  setSelectedServer: (name) => set({ selectedServer: name }),
  isChatLoading: false,
  setChatLoading: (loading) => set({ isChatLoading: loading }),
}));