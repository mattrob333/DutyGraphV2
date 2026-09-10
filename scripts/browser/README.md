# Optional public gallery browser check

Run from the repository root with Node 24. This read-only check verifies the four website screenshots, keyboard navigation, zoom and desktop/mobile layout. It does not sign in, submit a demo form or call paid providers.

Playwright is optional tooling, not an application dependency:

```powershell
npm.cmd install --no-save --package-lock=false playwright
npx.cmd playwright install chromium
node scripts/browser/verify-product-gallery.mjs http://127.0.0.1:4317
```

Start the app with `npm.cmd run dev` first, or pass a hosted base URL such as `https://dutygraph.com`. If using an already installed Chromium browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable instead of installing Chromium. No machine-specific path is embedded in the script.

Screenshots and a JSON check summary go into ignored `work/`. The current assertions intentionally describe the four-view gallery and 1626-pixel-wide Work Map asset; update them when the gallery changes. These checks do not prove authenticated audit delivery or real-client results. `npm.cmd ci` later removes optional packages not in the lockfile.
