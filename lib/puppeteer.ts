import { existsSync } from "fs";

// Where macOS / Linux usually keep an installed Chrome or Chromium binary.
// In dev we prefer one of these over Puppeteer's bundled Chrome so the user
// doesn't have to run `npx puppeteer browsers install chrome` (~170MB download).
const SYSTEM_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findSystemChrome(): string | null {
  for (const p of SYSTEM_CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

export async function getBrowser() {
  if (process.env.NODE_ENV === "development") {
    const puppeteer = await import("puppeteer");
    const opts: Parameters<typeof puppeteer.default.launch>[0] = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
    const chromePath = findSystemChrome();
    if (chromePath) {
      opts.executablePath = chromePath;
    }
    return puppeteer.default.launch(opts);
  }
  const chromium = await import("@sparticuz/chromium");
  const puppeteerCore = await import("puppeteer-core");
  return puppeteerCore.default.launch({
    args: chromium.default.args,
    executablePath: await chromium.default.executablePath(),
    headless: true,
  });
}
