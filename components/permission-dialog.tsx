'use client';

import { useState } from 'react';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { Shield, AlertTriangle, Check, X } from 'lucide-react';

export function PermissionDialog() {
  const { pendingPermissions, grantPermissions, removePermissionRequest } = useMCPStore();
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  if (pendingPermissions.length === 0) {
    return null;
  }

  const currentRequest = pendingPermissions[0];

  const handleGrant = () => {
    const selected = selectedPermissions[currentRequest.serverName] || currentRequest.permissions;
    grantPermissions(currentRequest.serverName, selected);
    setSelectedPermissions(prev => {
      const next = { ...prev };
      delete next[currentRequest.serverName];
      return next;
    });
  };

  const handleDeny = () => {
    removePermissionRequest(currentRequest.serverName);
    setSelectedPermissions(prev => {
      const next = { ...prev };
      delete next[currentRequest.serverName];
      return next;
    });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => {
      const current = prev[currentRequest.serverName] || currentRequest.permissions;
      const isSelected = current.includes(permission);
      
      return {
        ...prev,
        [currentRequest.serverName]: isSelected
          ? current.filter(p => p !== permission)
          : [...current, permission]
      };
    });
  };

  const currentSelected = selectedPermissions[currentRequest.serverName] || currentRequest.permissions;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold">Permission Request</h2>
              <p className="text-sm text-gray-600">Server: {currentRequest.serverName}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                {currentRequest.reason || `The server "${currentRequest.serverName}" is requesting the following permissions to continue.`}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Requested Permissions:</p>
            {currentRequest.permissions.map((permission) => (
              <label
                key={permission}
                className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={currentSelected.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">{permission}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Deny
            </button>
            <button
              onClick={handleGrant}
              disabled={currentSelected.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Grant Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}