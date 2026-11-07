// Full-play smoke test through the real DOM.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
const URL_ = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT = 'shots/play';
mkdirSync(OUT, { recursive: true });

const child = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1280,900',
  '--user-data-dir=C:\\Users\\eless\\AppData\\Local\\Temp\\opencode\\pimp-chrome3',
  'about:blank',
], { stdio: 'ignore' });

await sleep(2500);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXC: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 500));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push('CONSOLE: ' + msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
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
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: URL_ });
await sleep(2200);

const step = async (label, fn, wait = 350) => {
  const res = await evaluate(`(() => { ${fn} })()`);
  await sleep(wait);
  console.log(`${label}: ${JSON.stringify(res)}`);
  return res;
};

// speed up boot
await step('fastBoot', `window.localStorage.setItem('pimp98.settings.v1', JSON.stringify({crt:false,scanlines:true,sound:false,fastBoot:true})); location.reload(); return true;`, 2200);

await step('new game', `const b=[...document.querySelectorAll('.title-opt')].find(x=>x.textContent.includes('Новая')); b.click(); return !!b;`, 1500);

await step('skip boot', `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Space'})); return true;`, 1200);

console.log('open windows:', await evaluate('document.querySelectorAll(".window").length'));
await shot('01-start');

// close intro event if present
const hadEvent = await evaluate(`!!document.querySelector('.event-overlay')`);
console.log('intro event:', hadEvent);
if (hadEvent) {
  await step('choose intro', `document.querySelectorAll('.event-choice')[0].click(); return true;`);
  await step('continue', `document.querySelector('.event-footer .btn').click(); return true;`);
}

// spend day slots via "Дождаться ночи" repeatedly until night, handling events
for (let i = 0; i < 12; i++) {
  const isEvent = await evaluate(`!!document.querySelector('.event-overlay')`);
  if (isEvent) {
    await step('resolve event', `document.querySelectorAll('.event-choice')[0].click(); return true;`, 250);
    await step('continue event', `document.querySelector('.event-footer .btn').click(); return true;`, 250);
    continue;
  }
  const clicked = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.win-body .btn')].find(x => x.textContent.trim() === 'Дождаться ночи');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  await sleep(350);
  if (!clicked) break;
}
console.log('slot now:', await evaluate(`document.querySelector('.dash-hero .slot')?.textContent ?? 'n/a'`));
await shot('02-evening');

// open clients
await step('open clients', `[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Клиенты')).click(); return true;`, 600);
console.log('offers:', await evaluate(`document.querySelectorAll('.client-row').length`));
console.log('assign selects:', await evaluate(`document.querySelectorAll('.client-row select').length`));

// assign everyone available
await step('assign', `(() => {
  const rows = [...document.querySelectorAll('.client-row')];
  let assigned = 0;
  for (const row of rows) {
    const sel = row.querySelector('select');
    const opt = [...sel.options].find(o => o.value);
    if (!opt) continue;
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', {bubbles:true}));
    assigned++;
  }
  return assigned;
})()`, 800);
await shot('03-assigned');

// start night
await step('start night', `(() => {
  const b = [...document.querySelectorAll('.clients-footer .btn')].find(x => x.textContent.includes('Начать ночь'));
  if (!b) return 'no button';
  b.click();
  return 'clicked';
})()`, 900);
await shot('04-night-report');
console.log('report:', (await evaluate('document.querySelector(".report")?.innerText ?? "NONE"')).slice(0, 350).replace(/\n/g, ' | '));

// next day
await step('next day', `(() => {
  const b = [...document.querySelectorAll('.event-footer .btn')].find(x => x.textContent.includes('Следующий') || x.textContent.includes('итогам'));
  if (!b) return 'no next';
  b.click();
  return 'ok';
})()`, 800);
await shot('05-next-day');
console.log('day:', await evaluate(`document.querySelector('.dash-hero .day')?.textContent ?? 'n/a'`));

// settings toggle
await step('settings', `[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Настройки')).click(); return true;`, 500);
await shot('06-settings');

// dossier with a real portrait
await step('roster', `[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Девушки')).click(); return true;`, 500);
await step('dossier', `document.querySelector('.girl-card').click(); return true;`, 600);
await shot('07-dossier');
console.log('portrait svg:', await evaluate(`!!document.querySelector('.dossier-portrait svg')`));

// save & reload
await step('save', `document.querySelector('.start-btn').click(); return true;`, 200);
await step('save click', `[...document.querySelectorAll('.start-item')].find(x=>x.textContent.includes('Сохранить')).click(); return true;`, 500);
console.log('save exists:', await evaluate(`!!window.localStorage.getItem('pimp98.save.v1')`));

console.log('JS LOGS:', logs.length ? logs.join('\n') : 'none');
ws.close();
child.kill();
