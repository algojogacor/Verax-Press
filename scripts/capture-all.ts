process.env.TEST_BASE_URL = "http://localhost:3000";
import { loginAs } from "../tests/lib/http";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const outDir = "D:\\Projects\\verax\\docs\\superpowers\\audits\\refinement-evidence";
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// 1. Get chief authentication cookie
const chiefClient = await loginAs("chief");
const cookies = chiefClient.cookies.split("; ").map((c) => {
  const [name, ...rest] = c.split("=");
  return { name, value: rest.join("=") };
});

const userDir = join(tmpdir(), "chrome-capture-all-" + Date.now());
const chromeProc = Bun.spawn([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "--headless=new",
  "--remote-debugging-port=9666",
  `--user-data-dir=${userDir}`,
  "--disable-gpu",
  "--window-size=1920,1080",
  "about:blank",
]);

await new Promise((r) => setTimeout(r, 2500));

try {
  const versionRes = await fetch("http://127.0.0.1:9666/json");
  const pages = await versionRes.json();
  const page = pages.find((p: any) => p.type === "page") ?? pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const send = (method: string, params: any = {}) =>
    new Promise<any>((resolve) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt: any) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener("message", handler);
          resolve(data.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Network.enable");
  await send("Page.enable");

  // Inject cookies for authenticated studio routes
  for (const c of cookies) {
    await send("Network.setCookie", {
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
    });
  }

  const targets = [
    { name: "01-homepage-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000", mobile: false },
    { name: "02-homepage-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000", mobile: true },
    { name: "03-homepage-mobile-small-360.png", w: 360, h: 800, url: "http://localhost:3000", mobile: true },
    { name: "04-homepage-mobile-large-430.png", w: 430, h: 932, url: "http://localhost:3000", mobile: true },
    { name: "05-homepage-tablet-768.png", w: 768, h: 1024, url: "http://localhost:3000", mobile: false },
    { name: "05b-homepage-tablet-landscape-1024.png", w: 1024, h: 768, url: "http://localhost:3000", mobile: false },
    { name: "06-homepage-laptop-1366.png", w: 1366, h: 768, url: "http://localhost:3000", mobile: false },
    { name: "07-homepage-wide-1920.png", w: 1920, h: 1080, url: "http://localhost:3000", mobile: false },
    { name: "08-standar-editorial-1440.png", w: 1440, h: 900, url: "http://localhost:3000/standar-editorial", mobile: false },
    { name: "09-about-verax-1440.png", w: 1440, h: 900, url: "http://localhost:3000/tentang", mobile: false },
    { name: "10-desk-listing-1440.png", w: 1440, h: 900, url: "http://localhost:3000/desk/hukum-keadilan", mobile: false },
    { name: "10b-desk-listing-wide-1920.png", w: 1920, h: 1080, url: "http://localhost:3000/desk/hukum-keadilan", mobile: false },
    { name: "11-article-detail-1440.png", w: 1440, h: 900, url: "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press", mobile: false },
    { name: "12-article-detail-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press", mobile: true },
    { name: "13-studio-login-1440.png", w: 1440, h: 900, url: "http://localhost:3000/studio/login", mobile: false },
    { name: "13b-studio-login-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/studio/login", mobile: true },
    { name: "14-keluhan-form-1440.png", w: 1440, h: 900, url: "http://localhost:3000/keluhan", mobile: false },
    { name: "14b-keluhan-form-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/keluhan", mobile: true },
    { name: "15-koreksi-log-1440.png", w: 1440, h: 900, url: "http://localhost:3000/koreksi", mobile: false },
    { name: "16-article-detail-wide-1920.png", w: 1920, h: 1080, url: "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press", mobile: false },
    { name: "17-cms-dashboard-1440.png", w: 1440, h: 900, url: "http://localhost:3000/studio", mobile: false },
    { name: "17b-cms-dashboard-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/studio", mobile: true },
    { name: "18-media-library-1440.png", w: 1440, h: 900, url: "http://localhost:3000/studio/media", mobile: false },
    { name: "18b-media-library-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/studio/media", mobile: true },
  ];

  for (const item of targets) {
    console.log(`Capturing ${item.name} (${item.w}x${item.h}, mobile: ${item.mobile})...`);
    await send("Emulation.setDeviceMetricsOverride", {
      width: item.w,
      height: item.h,
      deviceScaleFactor: 1,
      mobile: item.mobile,
    });

    await send("Page.navigate", { url: item.url });
    await new Promise((r) => setTimeout(r, 1800));

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(shot.data, "base64");
    const outPath = join(outDir, item.name);
    await Bun.write(outPath, buffer);
    console.log(`[OK] Saved ${item.name}`);
  }

  ws.close();
  console.log("All screenshots captured successfully!");
} finally {
  chromeProc.kill();
}
