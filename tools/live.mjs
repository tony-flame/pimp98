// End-to-end check against the deployed GitHub Pages build.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9331;
const URL_ = process.argv[2] ?? 'https://tony-flame.github.io/pimp98/';
const OUT = 'shots/live';
mkdirSync(OUT, { recursive: true });

const child = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1100,820',
  '--force-device-scale-factor=1',
  '--user-data-dir=C:\\Users\\eless\\AppData\\Local\\Temp\\opencode\\pimp-live',
  'about:blank',
], { stdio: 'ignore' });

await sleep(2500);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    problems.push('EXC ' + (msg.params.exceptionDetails.exception?.description ?? '').slice(0, 200));
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    problems.push('LOG ' + msg.params.entry.text.slice(0, 200));
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
await send('Log.enable');
await send('Page.navigate', { url: URL_ });
await sleep(3000);

console.log('title:', await evaluate('document.title'));
console.log('title screen:', await evaluate('!!document.querySelector(".title-screen")'));
await shot('01-title');

await evaluate(`window.localStorage.setItem('pimp98.settings.v1', JSON.stringify({crt:false,scanlines:true,sound:false,fastBoot:true})); location.reload();`);
await sleep(2500);
await evaluate(`[...document.querySelectorAll('.title-opt')].find(x=>x.textContent.includes('Новая')).click()`);
await sleep(1600);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Space'}))`);
await sleep(1400);
if (await evaluate(`!!document.querySelector('.event-overlay')`)) {
  await evaluate(`document.querySelectorAll('.event-choice')[0].click()`);
  await sleep(250);
  await evaluate(`document.querySelector('.event-footer .btn').click()`);
  await sleep(450);
}
console.log('office windows:', await evaluate('document.querySelectorAll(".window").length'));
console.log('hero:', await evaluate(`document.querySelector('.dash-hero .day')?.textContent`));

// run to night
for (let i = 0; i < 8; i++) {
  if (await evaluate(`document.querySelector('.dash-hero .slot')?.textContent.startsWith('Ночь')`)) break;
  await evaluate(`[...document.querySelectorAll('.win-body .btn')].find(x => x.textContent.trim() === 'Дождаться ночи')?.click()`);
  await sleep(420);
  if (await evaluate(`!!document.querySelector('.event-overlay')`)) {
    await evaluate(`document.querySelectorAll('.event-choice')[0].click()`);
    await sleep(200);
    await evaluate(`document.querySelector('.event-footer .btn').click()`);
    await sleep(320);
  }
}

await evaluate(`[...document.querySelectorAll('.desk-icon')].find(n=>n.textContent.includes('Клиенты'))?.click()`);
await sleep(700);
console.log('offers:', await evaluate('document.querySelectorAll(".client-row").length'));

await evaluate(`(() => {
  const rows = [...document.querySelectorAll('.client-row')];
  for (const row of rows) {
    const sel = row.querySelector('select');
    if (!sel) continue;
    const opt = [...sel.options].find(o => o.value);
    if (!opt) continue;
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    break;
  }
})()`);
await sleep(400);
await evaluate(`[...document.querySelectorAll('.clients-footer .btn')].find(x => x.textContent.includes('Начать ночь'))?.click()`);
await sleep(1200);
console.log('report:', (await evaluate(`document.querySelector('.report')?.innerText ?? 'NONE'`)).slice(0, 160).replace(/\n/g, ' | '));
await shot('02-night');

// save works on the deployed origin?
const saved = await evaluate(`!!window.localStorage.getItem('pimp98.save.v1')`);
console.log('localStorage save:', saved);
console.log('storage origin:', await evaluate('location.origin'));

console.log('problems:', problems.length ? problems.join(' || ') : 'none');
ws.close();
child.kill();
