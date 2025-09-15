import type { NextRequest } from "next/server";

// Keep-alive ping interval (30 seconds)
const KEEP_ALIVE_INTERVAL = 30000;
// Connection timeout (5 minutes)
const CONNECTION_TIMEOUT = 300000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");
  const authHeader = searchParams.get("auth");

  if (!targetUrl) {
    return new Response("Missing target URL", { status: 400 });
  }

  // AbortController for timeout management
  const abortController = new AbortController();
  let timeoutHandle: NodeJS.Timeout;

  // Reset timeout on activity
  const resetTimeout = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      console.warn("SSE proxy connection timeout, aborting...");
      abortController.abort();
    }, CONNECTION_TIMEOUT);
  };

  try {
    // Create headers for the SSE request
    const headers: HeadersInit = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    // Add authorization header if provided
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Start timeout
    resetTimeout();

    // Connect to the remote SSE endpoint with abort signal
    const response = await fetch(targetUrl, {
      headers,
      signal: abortController.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(
        `Failed to connect to SSE endpoint: ${response.status} ${response.statusText}`,
        { status: response.status },
      );
    }

    // Check if response is SSE
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      return new Response("Remote endpoint did not return SSE content", {
        status: 502,
      });
    }

    // Create a TransformStream to proxy the SSE data with keep-alive
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        // Keep-alive ping interval
        const keepAliveInterval = setInterval(() => {
          try {
            // Send SSE comment as keep-alive ping
            const ping = encoder.encode(": ping\n\n");
            controller.enqueue(ping);
            resetTimeout(); // Reset timeout on ping
          } catch (error) {
            console.error("Keep-alive ping error:", error);
            clearInterval(keepAliveInterval);
          }
        }, KEEP_ALIVE_INTERVAL);

        try {
          while (true) {
            // Read with timeout
            const readPromise = reader.read();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Read timeout")), 60000),
            );

            const { done, value } = await Promise.race([
              readPromise,
              timeoutPromise,
            ]).then(
              (result) => result as { done: boolean; value?: Uint8Array },
              (error) => {
                console.error("Read error:", error);
                throw error;
              },
            );

            if (done) break;

            // Reset timeout on data received
            resetTimeout();

            // Pass through the data
            controller.enqueue(value);

            // Log activity for debugging
            const text = decoder.decode(value, { stream: true });
            if (text.trim() && !text.startsWith(":")) {
              console.log("SSE data received:", text.substring(0, 100));
            }
          }
        } catch (error) {
          console.error("SSE proxy stream error:", error);
          if (!abortController.signal.aborted) {
            controller.error(error);
          }
        } finally {
          clearInterval(keepAliveInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          controller.close();
          reader.releaseLock();
        }
      },
    });

    // Return the SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
  } catch (error) {
    console.error("SSE proxy error:", error);
    return new Response(
      `SSE proxy error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}
