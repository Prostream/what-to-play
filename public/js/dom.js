export const $ = (selector) => document.querySelector(selector);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label, action, className = 'choice') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function link(label, url, className = '') {
  const node = el('a', className, label);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

export function message(error) {
  return error instanceof TypeError
    ? 'Could not connect. Please try again.'
    : error.message;
}
