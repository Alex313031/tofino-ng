/**
 * Convert whatever the user typed into the URL bar into an actual URL
 */
export function fixURL(typed) {
  if (typed.includes('://')) {
    return typed;
  }

  if (!typed.includes(' ') && typed.includes('.')) {
    return `http://${typed}`;
  }

  return 'https://www.google.com/search?ie=utf-8&oe=utf-8&q=' + encodeURIComponent(typed);
}

/**
 *
 */
export function getBestDropItem(dataTransfer) {
  let uriitem = null;
  let textitem = null;
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    if (item.type === 'application/vnd.mozilla.bh.page') {
      return item;
    }
    if (item.type === 'text/uri-list') {
      uriitem = item;
    }
    if (item.type === 'text/plain') {
      textitem = item;
    }
  }
  return uriitem || textitem;
}

/**
 *
 */
export function getCurrentWebView(document) {
  return document.querySelector('#browser-page.visible > web-view').webview;
}

/**
 *
 */
export function getWebView(document, pageIndex) {
  const element = document.querySelector(`web-view.webview-${pageIndex}`);
  if (element == null) {
    throw new Error(`No webview for pageIndex=${pageIndex}`);
  }
  return element.webview;
}
