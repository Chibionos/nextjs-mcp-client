import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Create a simple HTML page that communicates with the opener window
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Callback</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #333; font-size: 1.5rem; margin-bottom: 1rem; }
          .success { color: #10b981; }
          .error { color: #ef4444; }
          .message { margin-top: 1rem; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          ${
            error
              ? `
            <h1 class="error">❌ Authorization Failed</h1>
            <p class="message">${errorDescription || error}</p>
          `
              : code
                ? `
            <h1 class="success">✅ Authorization Successful</h1>
            <p class="message">Completing authentication...</p>
          `
                : `
            <h1>Processing...</h1>
          `
          }
        </div>
        <script>
          // Send the OAuth callback data to the opener window
          const params = {
            code: ${JSON.stringify(code)},
            state: ${JSON.stringify(state)},
            error: ${JSON.stringify(error)},
            errorDescription: ${JSON.stringify(errorDescription)}
          };

          console.log('[OAuth Callback] Page loaded with params:', params);
          console.log('[OAuth Callback] Window opener exists:', !!window.opener);
          console.log('[OAuth Callback] Origin:', '${request.headers.get("origin")}');

          if (window.opener) {
            try {
              console.log('[OAuth Callback] Sending message to opener...');
              window.opener.postMessage({
                type: 'oauth-callback',
                ...params
              }, '${request.headers.get("origin") || "*"}');
              console.log('[OAuth Callback] Message sent successfully');

              // Update UI to show success
              const messageEl = document.querySelector('.message');
              if (messageEl) {
                messageEl.textContent = 'Authentication complete! This window will close automatically...';
              }

              // Close window after a short delay
              setTimeout(() => {
                console.log('[OAuth Callback] Closing window...');
                window.close();
              }, 2000);
            } catch (e) {
              console.error('[OAuth Callback] Error sending message:', e);
              document.querySelector('.message').textContent =
                'Error communicating with parent window. Please close this window and try again.';
            }
          } else {
            console.log('[OAuth Callback] No opener window found');
            // If no opener, display the data
            document.querySelector('.message').textContent =
              'Please copy this code to your application: ' + (params.code || params.error);
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("[OAuth] Callback error:", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 },
    );
  }
}
