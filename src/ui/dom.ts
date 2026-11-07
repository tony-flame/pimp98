type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === false) continue;
      if (key === 'class') {
        el.className = String(value);
      } else if (key === 'html') {
        el.innerHTML = String(value);
      } else if (key === 'text') {
        el.textContent = String(value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Element, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(child));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function qs<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): () => void {
  el.addEventListener(type, handler as EventListener);
  return () => el.removeEventListener(type, handler as EventListener);
}

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
