"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract OAuth parameters
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Send message to opener window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth-callback",
          code,
          state,
          error: error ? `${error}: ${errorDescription || ""}` : undefined,
        },
        window.location.origin,
      );

      // Show success message then close
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center p-8 rounded-lg border bg-card">
        <h1 className="text-2xl font-bold mb-4">Authentication Complete</h1>
        <p className="text-muted-foreground mb-4">
          You can close this window now...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 rounded-lg border bg-card">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
