import CollectionRenderer from './CollectionRenderer'

// An extension to render sanitized plain text in a chat message

class APIManagementRenderer extends CollectionRenderer {
  render(content: any): string {
    console.log(content);
    
    return `
    <div class="collection-api">
        <img src="/ph_250.png" alt="logo" class="rounded-full w-14 h-14" />
        <div class="collection-content">
            <p class="mb-1 ml-2 font-bold">${content.namespace}</p>
            <p class="mb-1 ml-2 text-sm text-gray-400">Base</p>
            <p class="mb-1 ml-2 text-sm text-gray-400">Website URL will be here</p>
            
            
            <div class="collection-action">
            <button class="btn btn-add"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.0002 0.959961V11.52M1.2002 5.99996H10.8002" stroke="#F7F7F8" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
            </svg> Add Credentials</button>
            <button class="btn btn-revoke"><svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.52 1.23999L1 12.76M1.00001 1.23999L12.52 12.76" stroke="#E8E9EB" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
            </svg> Revoke</button>
            </div>
        </div>
    </div>`
}
}

export default APIManagementRenderer