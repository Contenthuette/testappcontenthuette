import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  path: "/healthz",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("ok", { status: 200 });
  }),
});

// ── Stripe: Checkout success redirect ──────────────────────────
http.route({
  path: "/stripe/success",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const token = url.searchParams.get("token");

    if (!sessionId) {
      return new Response(errorPage("Ungültige Sitzung"), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Verify the Stripe session and update pending subscription
    try {
      const result: string = await ctx.runAction(internal.stripeActions.verifyCheckoutSession, {
        stripeSessionId: sessionId,
      });

      if (result === "success") {
        return new Response(successPage(), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } else {
        return new Response(errorPage("Zahlung konnte nicht bestätigt werden"), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch (e) {
      console.error("Stripe success handler error:", e);
      return new Response(errorPage("Ein Fehler ist aufgetreten"), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }),
});

// ── Stripe: Checkout cancel redirect ───────────────────────────
http.route({
  path: "/stripe/cancel",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(cancelPage(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),
});

export default http;

// ── HTML Templates ─────────────────────────────────────────────

function pageShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Z</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Helvetica Neue', sans-serif;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      color: #000;
    }
    .card {
      text-align: center;
      max-width: 360px;
    }
    .logo {
      font-size: 56px;
      font-weight: 900;
      letter-spacing: -2px;
      margin-bottom: 24px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 16px; color: #666; line-height: 1.5; }
    .hint { margin-top: 20px; font-size: 14px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Z</div>
    ${content}
  </div>
</body>
</html>`;
}

function successPage(): string {
  return pageShell(`
    <div class="icon">✅</div>
    <h1>Zahlung erfolgreich!</h1>
    <p>Dein Z-Abo ist bereit. Gehe zurück zur App, um dein Konto zu erstellen.</p>
    <p class="hint">Du kannst dieses Fenster jetzt schließen.</p>
  `);
}

function cancelPage(): string {
  return pageShell(`
    <div class="icon">❌</div>
    <h1>Zahlung abgebrochen</h1>
    <p>Kein Problem! Gehe zurück zur App, um es erneut zu versuchen.</p>
    <p class="hint">Du kannst dieses Fenster jetzt schließen.</p>
  `);
}

function errorPage(message: string): string {
  return pageShell(`
    <div class="icon">⚠️</div>
    <h1>${message}</h1>
    <p>Bitte versuche es erneut oder kontaktiere den Support.</p>
    <p class="hint">Du kannst dieses Fenster jetzt schließen.</p>
  `);
}
