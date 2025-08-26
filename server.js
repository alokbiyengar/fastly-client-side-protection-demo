const express = require("express");
const app = express();

// --- CSP (Report-Only) DEMO ---
// Toggle whether the *app itself* adds CSP headers.
// Default: true (handy for local dev). In Render/Fastly tests, set ENABLE_APP_CSP=false.
const ENABLE_APP_CSP = process.env.ENABLE_APP_CSP !== "false";

// Use REPORT_ONLY=true/false to switch between Report-Only and Blocking for app CSP.
// Default: true (Report-Only).
const REPORT_ONLY = process.env.REPORT_ONLY !== "false";

// A policy that *allows* same-origin scripts and lodash from unpkg.
// It does NOT allow scripts from evil.example.org, which will trigger a violation.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
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

// serve static assets
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

// Page 1: Checkout (will later become a CSP "Page")
app.get("/checkout", (_req, res) => {
  res.send(`
    <html>
      <head>
        <title>Checkout</title>
        <!-- Third-party font + image to observe later -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style> body { font-family: Inter, system-ui, sans-serif; } </style>
      </head>
      <body>
        <h1>Checkout</h1>
        <img src="https://picsum.photos/400/120" alt="demo image"/>
        <!-- Same-origin script -->
        <script src="/public/app.js"></script>
        <!-- Harmless third-party script (you’ll see it in inventory later) -->
        <script src="https://unpkg.com/lodash@4.17.21/lodash.min.js"></script>
        <!-- A deliberately “suspicious” domain to create a CSP violation later -->
        <script src="https://evil.example.org/x.js"></script>
      </body>
    </html>
  `);
});

// Page 2: Profile (a second area to compare behavior)
app.get("/profile", (_req, res) => {
  res.send(`
    <html>
      <head><title>Profile</title></head>
      <body>
        <h1>Profile</h1>
        <!-- Same-origin script only -->
        <script src="/public/app.js"></script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

// simple health check
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Demo listening on http://localhost:${PORT}`);
});