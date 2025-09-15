/**
 * Get the application URL for OAuth callbacks and other purposes
 * Uses NEXT_PUBLIC_APP_URL environment variable if set,
 * otherwise falls back to window.location.origin in the browser
 */
export function getAppUrl(): string {
  // In server context, always use the environment variable
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
    );
  }

  // In browser context, prefer environment variable but fall back to origin
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fall back to current origin
  return window.location.origin;
}

/**
 * Get the OAuth callback URL
 */
export function getOAuthCallbackUrl(): string {
  return `${getAppUrl()}/oauth/callback`;
}