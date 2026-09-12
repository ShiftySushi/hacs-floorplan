// randomUUID requires HTTPS; local HTTP editors still provide getRandomValues.
export const newId=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
export function element(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'text') node.textContent = value;
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children); return node;
}
export const button = (text, onclick, props = {}) => element('button', { text, onclick, type: 'button', ...props });
// Keep unchanged panels mounted; changed content retains its scroll and focus.
export function updatePanel(parent, selector, next) {
  const previous=parent.querySelector(selector);
  if(previous && next && previous.panelIdentity===next.panelIdentity && previous.outerHTML===next.outerHTML)return previous;
  const scroll=previous?.scrollTop || 0,restore=preserveFocus(parent.getRootNode());
  if(previous)next?previous.replaceWith(next):previous.remove();
  else if(next)parent.append(next);
  if(next)next.scrollTop=scroll;
  restore();return next;
}
export const field = (text, input) => element('label', { className: input.type === 'checkbox' ? 'check' : '' }, [document.createTextNode(text), input]);
export function svgElement(tag, props = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(props)) node.setAttribute(key, value);
  return node;
}
export function preserveFocus(root) {
  const active=root.activeElement;
  if (!active || active.tagName!=='BUTTON') return ()=>{};
  const label=active.getAttribute('aria-label'),text=active.textContent;
  return ()=>{if(!active.isConnected){const next=[...root.querySelectorAll('button')].find(node=>label?node.getAttribute('aria-label')===label:node.textContent===text);next?.focus({preventScroll:true});}};
}
