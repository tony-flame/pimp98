// Captures the three README screenshots at a clean 1024x768 stage.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9330;
const URL_ = process.argv[2] ?? 'http://127.0.0.1:5173/';
const OUT = 'docs/screenshots';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const child = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1024,768',
  '--force-device-scale-factor=1',
  '--user-data-dir=C:\\Users\\eless\\AppData\\Local\\Temp\\opencode\\pimp-shot',
  'about:blank',
], { stdio: 'ignore' });

await sleep(2500);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};
const send = (method, params = {}) => {
  const mid = ++id;
  return new Promise((resolve, reject) => {
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('saved', name);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ });
await sleep(2200);

// Settings: keep CRT on (it is the point), disable its flicker animation for a clean still.
await evaluate(`window.localStorage.setItem('pimp98.settings.v1', JSON.stringify({crt:false,scanlines:true,sound:false,fastBoot:true})); location.reload();`);
await sleep(2200);

// 1. Title screen
await shot('01-title');

// Start
await evaluate(`[...document.querySelectorAll('.title-opt')].find(x=>x.textContent.includes('Новая')).click()`);
await sleep(1600);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Space'}))`);
await sleep(1300);
if (await evaluate(`!!document.querySelector('.event-overlay')`)) {
  await evaluate(`document.querySelectorAll('.event-choice')[0].click()`);
  await sleep(220);
  await evaluate(`document.querySelector('.event-footer .btn').click()`);
  await sleep(450);
}

// 2. Office + roster on the right
await evaluate(`[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Девушки'))?.click()`);
await sleep(900);
await shot('02-office-roster');

// 3. Night roster with offers
await evaluate(`[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Клиенты'))?.click()`);
await sleep(500);
for (let i = 0; i < 8; i++) {
  if (await evaluate(`document.querySelector('.dash-hero .slot')?.textContent.startsWith('Ночь')`)) break;
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('.win-body .btn')].find(x => x.textContent.trim() === 'Дождаться ночи');
    b?.click();
    return !!b;
  })()`);
  await sleep(400);
  if (await evaluate(`!!document.querySelector('.event-overlay')`)) {
    await evaluate(`document.querySelectorAll('.event-choice')[0].click()`);
    await sleep(200);
    await evaluate(`document.querySelector('.event-footer .btn').click()`);
    await sleep(300);
  }
}
await evaluate(`[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Клиенты'))?.click()`);
await sleep(700);
await evaluate(`(() => {
  const rows = [...document.querySelectorAll('.client-row')];
  const used = new Set();
  for (const row of rows) {
    const sel = row.querySelector('select');
    if (!sel) continue;
    const opt = [...sel.options].find(o => o.value && !used.has(o.value));
    if (!opt) continue;
    used.add(opt.value);
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
})()`);
await sleep(700);
await shot('03-night-clients');

// 4. An event card (force a girl-free one to show the dossier document art)
await evaluate(`(() => {
  const app = window.__pimpApp;
  const st = app.currentState;
  st.pendingEvent = { eventId: 'cop_visit', day: st.day, slot: st.slot, chosen: null };
  app.syncEvent();
})()`);
await sleep(700);
await shot('04-event');

// 5. Ending screen
await evaluate(`(() => {
  const app = window.__pimpApp;
  const st = app.currentState;
  app.currentState.pendingEvent = null;
  document.querySelectorAll('.event-overlay').forEach(n => n.remove());
  // A finished week reads better in a README than a one-day snapshot.
  st.day = 7;
  st.slot = 3;
  st.cash = 16240;
  st.heat = 34;
  st.reputation = 64;
  st.respect = 47;
  st.stats.nights = 7;
  st.stats.totalGross = 31840;
  st.stats.incidents = 3;
  st.girls = st.girls.map((g) => ({ ...g, hired: true, loyalty: 74, stress: 26, skill: 61, trust: 40 }));
  app.finish();
})()`);
await sleep(900);
await shot('05-ending');

ws.close();
child.kill();
console.log('done');
