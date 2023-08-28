import CollectionRenderer from './CollectionRenderer'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
const mdRenderer = new marked.Renderer();
mdRenderer.link = function(href, title, text) {
  const link = marked.Renderer.prototype.link.apply(this, arguments as any);
  return link.replace("<a", "<a target='_blank'");
};

class ExtensionRenderer extends CollectionRenderer {
  render(content: any): string {
    const canOpen = content.canOpen === "true" || content.canOpen === "undefined"
    const buttonText = content.installed === "true" ? 'Open' : 'Install'
    return `
    <div class="collection-extension"  >
      <div class="collection-extension-header">
        <div class="collection-extension-header-title">${content.title}</div>
        <div class="flex-grow"></div>
        <img src="/extensions/${content.id}/logo.png" class="collection-extension-header-logo" />
      </div>
      <div class="collection-extension-body">
      <span>About the extension:</span>
      ${ DOMPurify.sanitize(marked.parse(content.description, {renderer: mdRenderer}), {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
          'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
          'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img'],
        ALLOWED_ATTR: ['href', 'alt', 'src', 'title', 'target']
      })
    }
      ${content.author ? `<span>Author:</span> ${content.author}` : ''}
      </div>
    <div class="collection-action">
  <button class="btn btn-primary" x-show="${canOpen}" @click='await clickToAction(item, "extension")'><svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none">
    <path d="M12.5 7.75V11.5C12.5 12.3284 11.8284 13 11 13H2C1.17157 13 0.5 12.3284 0.5 11.5V7.75M9.5 4L6.5 1M6.5 1L3.5 4M6.5 1V10" stroke="white" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>${buttonText}</span>
    </button>

    <span class="flex-grow"></span>
    <button class="btn btn-secondary" @click="await focusItem(item)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 3.67333V3.66667M7 10.3333V5.66667M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7Z" stroke="#505050" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><span>Details</span></button>
  </div>
  </div>`
  }
}

export default ExtensionRenderer
