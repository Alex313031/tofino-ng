/*
Copyright 2016 Mozilla

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
*/

/**
 * React doesn't support non-HTML attributes unless the element is a custom
 * element which must have a hyphen in the tag name. This means React can't
 * render most of the attributes of a <webview> so we use this <web-view> as a
 * wrapper.
 */
(function() {
  class WebView extends HTMLElement {
    createdCallback() {
      const shadow = this.createShadowRoot();

      this.webview = document.createElement('webview');
      for (let i = 0; i < this.attributes.length; i++) {
        const attr = this.attributes[i];
        this.webview.setAttribute(attr.name, attr.value);
      }

      shadow.appendChild(this.webview);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (newValue) {
        this.webview.setAttribute(name, newValue);
      } else {
        this.webview.removeAttribute(name);
      }
    }
  }

  document.registerElement('web-view', WebView);
}());
