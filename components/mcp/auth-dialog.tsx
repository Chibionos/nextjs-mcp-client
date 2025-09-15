"use client";

import { AlertCircle, ExternalLink, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OAuthService } from "@/lib/services/oauth-service";
import type { MCPServerConfig } from "@/lib/types/mcp";
import { getOAuthCallbackUrl } from "@/lib/utils/app-url";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  serverConfig: MCPServerConfig | null;
  onAuthSuccess: (accessToken: string, refreshToken?: string) => void;
  onAuthError: (error: string) => void;
}

export function AuthDialog({
  isOpen,
  onClose,
  serverName,
  serverConfig,
  onAuthSuccess,
  onAuthError,
}: AuthDialogProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (serverConfig?.oauth && isOpen) {
      // Parse the authorization URL to show domain
      try {
        const url = new URL(serverConfig.oauth.authorizationEndpoint);
        setAuthUrl(url.hostname);
      } catch {
        setAuthUrl(null);
      }
    }
  }, [serverConfig, isOpen]);

  const handleAuthenticate = async () => {
    if (!serverConfig?.oauth) {
      setError("OAuth configuration is missing");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const oauthService = OAuthService.getInstance();
      const result = await oauthService.startAuthFlow(serverName, {
        authorizationEndpoint: serverConfig.oauth.authorizationEndpoint,
        tokenEndpoint: serverConfig.oauth.tokenEndpoint,
        clientId: serverConfig.oauth.clientId,
        clientSecret: serverConfig.oauth.clientSecret,
        redirectUri: getOAuthCallbackUrl(),
        scope: serverConfig.oauth.scope || "read write",
        usePKCE: serverConfig.oauth.usePKCE !== false,
        grantType: serverConfig.oauth.grantType || "authorization_code",
        responseType: serverConfig.oauth.responseType || "code",
      });

      if (result.success && result.accessToken) {
        onAuthSuccess(result.accessToken, result.refreshToken);
        onClose();
      } else {
        const errorMsg = result.error || "Authentication failed";
        setError(errorMsg);
        onAuthError(errorMsg);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Authentication failed";
      setError(errorMsg);
      onAuthError(errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication Required
          </DialogTitle>
          <DialogDescription>
            The MCP server <strong>{serverName}</strong> requires authentication
            to connect.
            {authUrl && (
              <span className="block mt-2 text-sm">
                You will be redirected to <strong>{authUrl}</strong> to sign in.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• A new window will open for authentication</li>
              <li>• Sign in with your credentials</li>
              <li>• Grant access to the MCP client</li>
              <li>• The window will close automatically</li>
            </ul>
          </div>

          {serverConfig?.oauth?.scope && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs font-medium mb-1">Requested permissions:</p>
              <p className="text-xs text-muted-foreground">
                {serverConfig.oauth.scope}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isAuthenticating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background" />
                Authenticating...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Authenticate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
