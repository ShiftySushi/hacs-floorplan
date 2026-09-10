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
export const field = (text, input) => element('label', { className: input.type === 'checkbox' ? 'check' : '' }, [document.createTextNode(text), input]);
export function svgElement(tag, props = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(props)) node.setAttribute(key, value);
  return node;
}
