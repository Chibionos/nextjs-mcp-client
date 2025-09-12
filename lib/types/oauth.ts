import { z } from 'zod';

// OAuth Configuration Schema
export const OAuthConfigSchema = z.object({
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  clientId: z.string(),
  clientSecret: z.string().optional(),
  redirectUri: z.string().url(),
  scope: z.string().optional().default('read write'),
  responseType: z.string().optional().default('code'),
  grantType: z.string().optional().default('authorization_code'),
  usePKCE: z.boolean().optional().default(true),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

// OAuth Token Response
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// OAuth State
export interface OAuthState {
  state: string;
  codeVerifier?: string;
  codeChallenge?: string;
  serverName: string;
  timestamp: number;
}

// SSE Configuration with OAuth
export interface SSEConfigWithAuth {
  url: string;
  headers?: Record<string, string>;
  oauth?: OAuthConfig;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

// Authentication Status
export enum AuthStatus {
  UNAUTHENTICATED = 'unauthenticated',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
  REFRESHING = 'refreshing',
}

// Authentication Result
export interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}