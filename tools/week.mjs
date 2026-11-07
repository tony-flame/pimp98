// Plays all seven days to the ending and captures the last screens.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const URL_ = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT = 'shots/week';
mkdirSync(OUT, { recursive: true });

const child = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--window-size=1280,900',
  '--user-data-dir=C:\\Users\\eless\\AppData\\Local\\Temp\\opencode\\pimp-chrome4', 'about:blank',
], { stdio: 'ignore' });

await sleep(2200);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
  }
};
const send = (method, params = {}) => {
  const mid = ++id;
  return new Promise((resolve, reject) => { pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); });
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: URL_ });
await sleep(2000);

await evaluate(`window.localStorage.setItem('pimp98.settings.v1', JSON.stringify({crt:false,scanlines:false,sound:false,fastBoot:true})); location.reload();`);
await sleep(2200);
await evaluate(`[...document.querySelectorAll('.title-opt')].find(x=>x.textContent.includes('Новая')).click()`);
await sleep(1600);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Space'}))`);
await sleep(1200);

const clickAny = async (selector, text) => evaluate(`(() => {
  const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
  const n = ${text ? `nodes.find(x => x.textContent.includes(${JSON.stringify(text)}))` : 'nodes[0]'};
  if (!n) return false;
  n.click();
  return true;
})()`);

let day = 1;
let guard = 0;
while (guard++ < 200) {
  await sleep(160);

  // event modal wins
  const hasEvent = await evaluate(`!!document.querySelector('.event-overlay')`);
  if (hasEvent) {
    const chosen = await evaluate(`!!document.querySelector('.event-choice:disabled')`);
    if (!chosen) {
      if (!(await clickAny('.event-choice'))) { /* nothing */ }
      await sleep(160);
    }
    await clickAny('.event-footer .btn');
    await sleep(160);
    continue;
  }

  const ended = await evaluate(`!!document.querySelector('.ending-screen') || !!document.querySelector('.bsod')`);
  if (ended) break;

  const dayText = await evaluate(`document.querySelector('.dash-hero .day')?.textContent ?? ''`);
  const m = /День (\d+)/.exec(dayText);
  if (m) day = Number(m[1]);

  // night report?
  const reportNext = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.event-footer .btn')].find(x => x.textContent.includes('Следующий') || x.textContent.includes('итогам'));
    if (!b) return false;
    b.click();
    return true;
  })()`);
  if (reportNext) { await sleep(300); continue; }

  // ensure clients open
  const clientsOpen = await evaluate(`!!document.querySelector('.clients-pane')`);
  if (!clientsOpen) {
    await evaluate(`[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Клиенты')).click()`);
    await sleep(250);
    continue;
  }

  const atNight = await evaluate(`(() => {
    const slot = document.querySelector('.dash-hero .slot')?.textContent ?? '';
    return slot.startsWith('Ночь');
  })()`);

  if (!atNight) {
    const skipped = await evaluate(`(() => {
      const b = [...document.querySelectorAll('.win-body .btn')].find(x => x.textContent.trim() === 'Дождаться ночи');
      if (!b) return false;
      b.click();
      return true;
    })()`);
    if (!skipped) {
      // fall back: hire nobody, just end the day
      await evaluate(`[...document.querySelectorAll('.win-body .btn')].find(x => x.textContent.trim() === 'Завершить неделю')?.click()`);
    }
    await sleep(250);
    continue;
  }

  // assign all offers to free girls
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
    return used.size;
  })()`);
  await sleep(250);

  const started = await clickAny('.clients-footer .btn', 'Начать ночь');
  if (!started) {
    await evaluate(`(() => {
      const b = [...document.querySelectorAll('.clients-footer .btn')].find(x => x.textContent.includes('Пропустить'));
      b?.click();
    })()`);
  }
  await sleep(400);

  if (day === 7) {
    const finalReport = await evaluate(`!!document.querySelector('.report')`);
    if (finalReport) await shot('final-report');
  }
}

await sleep(900);
await shot('final-screen');
console.log('day:', await evaluate(`document.querySelector('.dash-hero .day')?.textContent ?? 'n/a'`));
console.log('ending:', await evaluate(`document.querySelector('.ending-card h1')?.textContent ?? 'n/a'`));
console.log('bsod:', await evaluate(`!!document.querySelector('.bsod')`));
console.log('code:', await evaluate(`document.querySelector('.ending-card .code')?.textContent ?? document.querySelector('.bsod')?.innerText.split('\\n')[2] ?? 'n/a'`));
console.log('logs:', logs.length ? logs.join(' | ') : 'none');

// if BSOD, dismiss it to reveal the ending card
if (await evaluate(`!!document.querySelector('.bsod')`)) {
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Space'}))`);
  await sleep(600);
  await shot('after-bsod');
  console.log('after bsod ending:', await evaluate(`document.querySelector('.ending-card h1')?.textContent ?? 'n/a'`));
}

ws.close();
child.kill();
