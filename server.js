const express = require("express");
const app = express();

/**
 * --- CSP (Report-Only) DEMO ---
 * Toggle whether the *app itself* adds CSP headers.
 * Default: true (handy for local dev). In Render/Fastly tests, set ENABLE_APP_CSP=false.
 */
const ENABLE_APP_CSP = process.env.ENABLE_APP_CSP == "false";

/**
 * Use REPORT_ONLY=true/false to switch between Report-Only and Blocking for app CSP.
 * Default: true (Report-Only).
 */
const REPORT_ONLY = process.env.REPORT_ONLY == "false";

/**
 * A policy that *allows* same-origin scripts and lodash from unpkg.
 * It does NOT allow scripts from evil.example.org, which will trigger a violation.
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net https://ajax.googleapis.com",
  "img-src 'self' https://picsum.photos data:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'"
].join("; ");

// Only attach CSP headers if ENABLE_APP_CSP is true.
// (When testing Fastly Client-Side Protection, set ENABLE_APP_CSP=false in Render.)
if (ENABLE_APP_CSP) {
  app.use((req, res, next) => {
    const headerName = REPORT_ONLY
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
    res.setHeader(headerName, cspDirectives);
    next();
  });
}

// Serve static assets
app.use("/public", express.static("public"));

app.get("/", (_req, res) => {
  res.send(`
    <html>
      <head><title>Home</title></head>
      <body>
        <h1>Home</h1>
        <p><a href="/checkout">Go to Checkout</a> | <a href="/profile">Go to Profile</a></p>
      </body>
    </html>
  `);
});

// Page 1: Checkout (lots of scripts for Fastly inventory)
app.get("/checkout", (_req, res) => {
  res.send(`
    <html>
      <head>
        <title>Checkout</title>
        <!-- Fonts & small inline style -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style> body { font-family: Inter, system-ui, sans-serif; } </style>
      </head>
      <body>
        <h1>Checkout</h1>
        <img src="https://picsum.photos/400/120" alt="demo image"/>

        <!-- First-party (same origin) -->
        <script src="/public/app.js"></script>
        <script src="/public/cart.js"></script>
        <script src="/public/checkout.js"></script>

        <!-- Third-party (no Cloudflare) -->
        <script src="https://unpkg.com/lodash@4.17.21/lodash.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/axios.min.js"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>

        <!-- Deliberate violation to generate a report -->
        <script src="https://evil.example.org/x.js"></script>
      </body>
    </html>
  `);
});

// Page 2: Profile (more scripts for inventory)
app.get("/profile", (_req, res) => {
  res.send(`
    <html>
      <head><title>Profile</title></head>
      <body>
        <h1>Profile</h1>

        <!-- First-party (same origin) -->
        <script src="/public/app.js"></script>
        <script src="/public/profile.js"></script>
        <script src="/public/analytics.js"></script>
        <script src="/public/utils.js"></script>

        <!-- Third-party (no Cloudflare) -->
        <script src="https://unpkg.com/dayjs@1.11.11/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@faker-js/faker@8.4.1/dist/faker.umd.min.js"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

// Simple health check
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Demo listening on http://localhost:${PORT}`);
});