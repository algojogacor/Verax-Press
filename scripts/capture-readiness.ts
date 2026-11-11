process.env.TEST_BASE_URL = "http://localhost:3000";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const mode = process.argv[2] || "baseline";
const outDir = join("D:\\Projects\\verax\\docs\\superpowers\\audits\\launch-readiness-evidence", mode);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const userDir = join(tmpdir(), "chrome-capture-readiness-" + Date.now());
const chromeProc = Bun.spawn([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "--headless=new",
  "--remote-debugging-port=9667",
  `--user-data-dir=${userDir}`,
  "--disable-gpu",
  "--window-size=1920,1080",
  "about:blank",
]);

await new Promise((r) => setTimeout(r, 2500));

interface PageAudit {
  name: string;
  url: string;
  httpStatus: number | null;
  overflowPx: number;
  consoleErrors: string[];
  exceptions: string[];
  ctaContrastOk: boolean;
}

const audits: PageAudit[] = [];

try {
  const versionRes = await fetch("http://127.0.0.1:9667/json");
  const pages = (await versionRes.json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const page = pages.find((p) => p.type === "page") ?? pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt: MessageEvent) => {
        const data = JSON.parse(String(evt.data));
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
  await send("Runtime.enable");
  await send("Log.enable");

  const targets = [
    { name: "01-homepage-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000", mobile: false },
    { name: "02-homepage-tablet-768.png", w: 768, h: 1024, url: "http://localhost:3000", mobile: false },
    { name: "03-homepage-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000", mobile: true },
    { name: "04-tentang-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/tentang", mobile: false },
    { name: "05-standar-editorial-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/standar-editorial", mobile: false },
    { name: "06-desk-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/desk/hukum-keadilan", mobile: false },
    { name: "07-opini-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/opini", mobile: false },
    { name: "08-artikel-detail-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press", mobile: false },
    { name: "09-artikel-detail-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/artikel/lima-tahap-sebelum-terbit-alur-editorial-verax-press", mobile: true },
    { name: "10-koreksi-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/koreksi", mobile: false },
    { name: "11-keluhan-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/keluhan", mobile: false },
    { name: "12-pedoman-kontributor-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/pedoman-kontributor", mobile: false },
    { name: "13-kontributor-daftar-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/kontributor/daftar", mobile: false },
    { name: "14-kontributor-login-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/kontributor/login", mobile: false },
    { name: "15-kontak-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/kontak", mobile: false },
  ];

  if (mode === "after") {
    targets.push(
      { name: "16-kirim-tulisan-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/kirim-tulisan", mobile: false },
      { name: "17-kirim-tulisan-mobile-390.png", w: 390, h: 844, url: "http://localhost:3000/kirim-tulisan", mobile: true },
      { name: "18-kebijakan-privasi-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/kebijakan-privasi", mobile: false },
      { name: "19-syarat-ketentuan-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/syarat-ketentuan", mobile: false },
      { name: "20-informasi-kelembagaan-desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000/informasi-kelembagaan", mobile: false }
    );
  }

  for (const item of targets) {
    console.log(`[${mode}] Capturing ${item.name} (${item.w}x${item.h})...`);
    let docStatus: number | null = null;
    const consoleErrors: string[] = [];
    const exceptions: string[] = [];

    const eventListener = (evt: MessageEvent) => {
      const msg = JSON.parse(String(evt.data));
      if (msg.method === "Network.responseReceived") {
        const { type, response } = msg.params;
        if (type === "Document" && response?.url?.startsWith("http://localhost:3000")) {
          docStatus = response.status;
        }
      } else if (msg.method === "Runtime.exceptionThrown") {
        const desc = msg.params?.exceptionDetails?.text || "Uncaught exception";
        exceptions.push(desc);
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        const text = (msg.params.args || []).map((a: any) => a.value ?? a.description ?? "").join(" ");
        consoleErrors.push(text || "console.error");
      } else if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
        consoleErrors.push(msg.params.entry.text || "Log error");
      }
    };

    ws.addEventListener("message", eventListener);

    await send("Emulation.setDeviceMetricsOverride", {
      width: item.w,
      height: item.h,
      deviceScaleFactor: 1,
      mobile: item.mobile,
    });

    await send("Page.navigate", { url: item.url });
    await new Promise((r) => setTimeout(r, 1500));

    const telemetry = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        const overflowPx = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const ctaEls = Array.from(document.querySelectorAll("main a.bg-verity-ink, main button.bg-verity-ink"));
        const ctaChecks = ctaEls.map((el) => {
          const st = getComputedStyle(el);
          return { text: (el.textContent || "").trim(), color: st.color, bg: st.backgroundColor, ok: st.color !== st.backgroundColor };
        });
        return { overflowPx, ctaChecks };
      })()`,
    });

    ws.removeEventListener("message", eventListener);

    const val = telemetry?.result?.value || { overflowPx: -1, ctaChecks: [] };
    const ctaContrastOk = (val.ctaChecks as Array<{ ok: boolean }>).every((c) => c.ok);

    audits.push({
      name: item.name,
      url: item.url,
      httpStatus: docStatus,
      overflowPx: val.overflowPx,
      consoleErrors,
      exceptions,
      ctaContrastOk,
    });

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(shot.data, "base64");
    const outPath = join(outDir, item.name);
    await Bun.write(outPath, buffer);
    console.log(
      `[OK] ${item.name} status=${docStatus} overflow=${val.overflowPx}px ctaOk=${ctaContrastOk} errors=${consoleErrors.length + exceptions.length}`,
    );
  }

  ws.close();

  const failures = audits.filter(
    (a) =>
      a.httpStatus === null ||
      a.httpStatus >= 400 ||
      a.overflowPx !== 0 ||
      a.consoleErrors.length > 0 ||
      a.exceptions.length > 0 ||
      !a.ctaContrastOk,
  );
  console.log(`\nCapture summary (${mode}): ${audits.length - failures.length}/${audits.length} clean.`);
  if (failures.length > 0) {
    console.error("Telemetry failures:", JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
} finally {
  chromeProc.kill();
}
