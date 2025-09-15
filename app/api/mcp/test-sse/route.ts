import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url, authToken } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("[Test SSE] Testing connection to:", url);
    console.log("[Test SSE] Token provided:", !!authToken);

    if (authToken) {
      console.log("[Test SSE] Token length:", authToken.length);
      console.log("[Test SSE] Token preview:", authToken.substring(0, 50));
    }

    // Test with a simple fetch first
    const headers: HeadersInit = {
      Accept: "text/event-stream",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    console.log("[Test SSE] Making test request with headers:", headers);

    // Make a test request
    const response = await fetch(url, {
      method: "GET",
      headers,
      // Don't follow redirects automatically
      redirect: "manual",
    });

    console.log("[Test SSE] Response status:", response.status);
    console.log(
      "[Test SSE] Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get("location");
      console.log("[Test SSE] Redirect to:", location);
      return NextResponse.json({
        status: response.status,
        redirect: location,
        message: "Server is redirecting. This may be normal for SSE endpoints.",
      });
    }

    if (response.status === 401) {
      return NextResponse.json({
        status: 401,
        error: "Authentication failed. Token may be invalid or expired.",
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    if (response.status === 403) {
      return NextResponse.json({
        status: 403,
        error: "Access forbidden. Token may not have sufficient permissions.",
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    if (response.status === 404) {
      return NextResponse.json({
        status: 404,
        error: "Endpoint not found. Please check the URL.",
      });
    }

    // Try to read some initial data
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      const { value, done } = await reader.read();

      if (value) {
        const text = decoder.decode(value);
        console.log(
          "[Test SSE] Initial data received:",
          text.substring(0, 200),
        );
      }

      reader.releaseLock();
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get("content-type"),
      message: "Connection test successful",
    });
  } catch (error) {
    console.error("[Test SSE] Test failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test failed",
        details:
          error instanceof Error
            ? {
                name: error.name,
                stack: error.stack,
              }
            : undefined,
      },
      { status: 500 },
    );
  }
}
