import Alpine from 'alpinejs'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import DOMPurify from 'dompurify'

import type CollectionRenderer from './renderers/CollectionRenderer';
import RecipeRenderer from './renderers/RecipeRenderer'
import BlockRenderer from './renderers/BlockRenderer'
import APIManagementRenderer from './renderers/APIManagementRenderer'
import ExtensionRenderer from './renderers/ExtensionRenderer'
import {OmniSDKClient} from 'omni-sdk';

const sdk = new OmniSDKClient("omni-core-collectionmanager").init();

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const args = new URLSearchParams(location.search);
const params = sdk.args
let focusedItem = null;
focusedItem = params?.focusedItem;
let viewerMode = focusedItem ? true : false;
let type = params?.type;
let filter = params?.filter;

const renderers = new Map<string, CollectionRenderer>()
renderers.set('recipe', new RecipeRenderer())
renderers.set('block', new BlockRenderer())
renderers.set('api', new APIManagementRenderer())
renderers.set('extension', new ExtensionRenderer())

const copyToClipboardComponent = () => {
  return {
    copyText: '',
    copyNotification: false,

    async copyToClipboard(item) {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const data = [new ClipboardItem({ [blob.type]: blob })];
      await navigator.clipboard.write(data);
      //alert('Item copied to clipboard');
      //navigator.clipboard.writeText(this.copyText);
      this.copyNotification = true;
      let that = this;
      setTimeout(function () {
        that.copyNotification = false;
      }, 3000);
    },
  };
};

const createGallery = function (itemsPerPage: number, itemApi: string) {
  return {
    type: type,
    viewerMode: viewerMode,
    currentPage: 0,
    itemsPerPage: itemsPerPage,
    itemApi: itemApi,
    items: [],
    totalPages: () => Math.ceil(this.items.length / this.itemsPerPage),
    multiSelectedItems: [],
    cursor: 0,
    showInfo: false,
    loading: false, // for anims
    scale: 1, // zoom
    x: 0, //pan
    y: 0,
    focusedItem: focusedItem || null,
    hover: false,

    async init() {
      await this.fetchItems({ replace: true, limit: itemsPerPage, cursor: 0 });
    },

    async fileToDataUrl(file) {
      /* Encode content of file as https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs */
      return new Promise(function (resolve, reject) {
        /* Load file into javascript. */
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    },
    renderItem(item, opts) {
      console.log('renderItem', item, opts);
      if (!item) {
        //return '<img src="/ph_250.png" />';
      } else {
        const renderer = renderers.get(item.type);
        if (renderer) {
          return renderer.render(item.value);
        } else {
          return '<img src="/ph_250.png" />';
        }
     }
    },

    async addItems(items, replace = false) {
      if (replace) {
        console.log('replace items', this.items, items)
        this.items = items;
      } else {
        this.items = this.items.concat(items);
      }
      this.cursor = this.items.length;
      this.totalPages = Math.ceil(this.items.length / this.itemsPerPage);
    },
    async loadMore() {
      if(this.currentPage === this.totalPages) {
        console.log('This is the last page')
        return;
      }
      const body: { limit: number; cursor: number; type: string; filter: string } = {
        limit: this.itemsPerPage,
        type: this.type,
        cursor: this.cursor,
        filter: this.search
      };
      const data = await sdk.runExtensionScript('collection', body);
      this.addItems(data.items, false);
      this.totalPages = data.totalPages;
      this.currentPage = data.currentPage;
      this.cursor = this.items.length;
    },
    async fetchItems(opts?: {
      cursor?: number;
      limit?: number;
      replace?: boolean;
    }) {
      if (this.viewerMode) {
        return Promise.resolve();
      }
      const body: { limit: number; cursor: number; type: string; filter: string } = {
        limit: this.itemsPerPage,
        type: this.type,
        cursor: 0,
        filter: this.search,
      };
      if (opts?.cursor) {
        body.cursor = opts?.cursor;
      }
      if (opts?.limit && typeof opts.limit === 'number' && opts.limit > 0) {
        body.limit = Math.max(opts.limit, 2);
      }
      const data = await sdk.runExtensionScript('collection', body);

      this.addItems(data.items, opts?.replace);
    },
    selectItem(item) {
      if (item.onclick) {
        return;
      }
      const idx = this.multiSelectedItems.indexOf(item);
      if (idx > -1) {
        this.multiSelectedItems.splice(idx, 1); // Deselect the item if it's already selected
      } else {
        this.multiSelectedItems.push(item); // Select the item
      }
    },
    paginate() {
      return this.items;
    },

    async nextItem() {
      const currentIndex = this.items.indexOf(this.focusedItem);
      if (currentIndex < this.items.length - 1) {
        await this.focusItem(this.items[currentIndex + 1]);
      }
    },

    animateTransition() {
      if (this.loading) {
        return;
      }
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
      }, 200); // Adjust this delay as needed
    },

    async previousItem() {
      const currentIndex = this.items.indexOf(this.focusedItem);
      if (currentIndex > 0) {
        await this.focusItem(this.items[currentIndex - 1]);
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage += 1;
      }
    },

    mouseEnter() {
      this.hover = true;
    },
    mouseLeave() {
      this.hover = false;
    },

    async focusItem(item) {
      this.animateTransition();
      this.x = 0;
      this.y = 0;
      this.scale = 1;
      if (item.onclick != null) {
        await item.onclick.call(item);
        return;
      }
      this.focusedItem = item;
      console.log('focusItem', item);
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },

    async importItem(item) {
      let args = {
        action: 'import',
        itemFid: item.fid,
      };
      const file = <any>(await sdk.runExtensionScript('export', args)).file;
      console.log('import', file);
      window.parent.location.href =
        window.parent.location.protocol +
        '//' +
        window.parent.location.host +
        `/?rx=${encodeURIComponent(file.url)}`;
    },
    zoomItem(event) {
      // Determine whether the wheel was scrolled up or down
      const direction = event.deltaY < 0 ? 0.1 : -0.1;

      // Get the current scale of the item
      const currentScale = this.$refs.zoomImg.style.transform || 'scale(1)';
      const currentScaleValue = parseFloat(currentScale.slice(6, -1));

      // Calculate the new scale
      const newScale = Math.min(
        Math.max(0.75, currentScaleValue + direction),
        5.0
      );
      this.scale = newScale;

      // Set the new scale
      this.$refs.zoomImg.style.transform = `scale(${newScale})`;
    },
    async deleteItemList(itemList) {
      if(!itemList || itemList.length === 0) return;
      let deletedItemList = [];
      if( Array.isArray(itemList) && itemList.length > 0) {
        if (!confirm(`Are you sure you want to delete ${itemList.length} items?`)) {
          return;
        }
        itemList.forEach(async (i) => {
          const result = await this.deleteItem(i);
          if(result) {
            deletedItemList.push(...result);
          }
        });
        if( deletedItemList?.length > 0 ) { 
          this.needRefresh = true;
          return deletedItemList
        } else {
          console.log(itemList)
          sdk.sendChatMessage(
            'Failed to delete item(s) ' + itemList.join(', '),
            'text/plain',
            {},
            ['error']
          );
          return null
        }
      }
    },
    async deleteItem(item) {
      const type = item.type;
      const payload = Alpine.raw(item.value);
      try {
        const result = await sdk.runExtensionScript('delete', { type: type, id: payload.id }); 
        if( result?.length > 0 ) { 
          this.needRefresh = true;
          return result
        } else {
          sdk.sendChatMessage(
            'Failed to delete item(s) ' + item.value.name,
            'text/plain',
            {},
            ['error']
          );
          return null
        }
      } catch (e) {
        console.error(e);
      }
    },
    async clickToAction(item, type: string) {
      if (type === 'recipe') {
        //@ts-expect-error
        await window.parent.client.workbench.loadRecipe(item.value.id, item.value.version);

        sdk.close();
      }
      else if (type == 'block') {
        console.log(await sdk.runClientScript('add', [item.value.name]))
      }
      else if (type == 'extension') {
        if (item.value.installed) {
          //@ts-expect-error
          sdk.signalIntent("show", item.value.id);
        } else {
          sdk.runClientScript('extensions',['add', item.value.url]);
        }
      }

    }
  };
};

window.Alpine = Alpine;
document.addEventListener('alpine:init', async () => {
  Alpine.data('collection', () => ({
    id: '',
    name: '',
    title: '',
    description: '',
    pictureUrl: '',
    type: '',
    category: '',
    author: '',
    tags: [],
    starred: false,
    canDelete: false,
    canOpen: false,
    installed: false,
    created: null,
    updated: null,
    deleted: false,
    setData(data) {
      this.id = data.id;
      this.name = data.meta?.name ?? data.name;
      this.title = data.meta?.title ?? data.title;
      this.description = data.meta?.description ?? data.description;
      this.pictureUrl = data.meta?.pictureUrl; // don't bother with fallback anymore
      this.type = data.type;
      this.category = data.category;
      this.author = data.meta?.author;
      this.tags = data.meta?.tags ?? data.tags;
      this.starred = data.starred;
      this.canDelete = data.canDelete;
      this.created = data.meta?.created;
      this.updated = data.meta?.updated;   
      this.installed = data.installed;
      this.canOpen = data.canOpen;   
    },
    get createdDate() {
      return this.created ? new Date(this.created).toLocaleString() : null;
    },
    get updatedDate() {
      return this.updated ? new Date(this.updated).toLocaleString() : null;
    }

  }));

  Alpine.data('appState', () => ({
    copyToClipboardComponent,
    createGallery,
    async copyToClipboard(itemUrl) {
      try {
        const res = await fetch(itemUrl);
        const blob = await res.blob();
        const data = [new ClipboardItem({ [blob.type]: blob })];
        await navigator.clipboard.write(data);
        alert('Item copied to clipboard');
      } catch (err) {
        console.error(err.name, err.message);
      }
    },

    moving: false,
    startMoving(e) {
      this.moving = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      e.preventDefault();
    },
    move(e) {
      if (!this.moving) return;
      this.x += e.clientX - this.lastX;
      this.y += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },
    stopMoving() {
      this.moving = false;
    },
    getTitle() {
      if(type === 'recipe') {
        return 'Recipes';
      } else if (type === 'block') {
        return 'Add Blocks';
      } else if (type === 'extension') {
        return 'Extensions';
      } else if (type === 'api') {
        return 'API Management';
      }
    },
    search: filter || '',
    prevSearch: '',
    needRefresh: false,
    async refresh() {
      await this.fetchItems({limit: this.itemsPerPage,replace:true});
      this.multiSelectedItems=[]; 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async filteredItems () {
      console.log('filteredItems', this.search, this.needRefresh);
      if (this.needRefresh) {
        this.cursor = 0
        this.needRefresh = false
      }
      const body: { limit: number; cursor: number; type: string; filter: string } = {
        limit: this.itemsPerPage,
        type: this.type,
        cursor: 0,
        filter: this.search
      };
      const data = await sdk.runExtensionScript('collection', body);
      this.addItems(data.items, true);
      this.cursor = this.items.length;
      return this.items;
    },
  }));

  Alpine.magic('tooltip', (el: HTMLElement) => (message) => {
    const instance = tippy(el, { content: message, trigger: 'manual' })

    instance.show()

    setTimeout(() => {
      instance.hide()

      setTimeout(() => instance.destroy(), 150)
    }, 2000)
  })

  // Directive: x-tooltip or x-tooltip:reactive
  Alpine.directive('tooltip', (el: HTMLElement, { value, expression }, { evaluate }) => {
    let text: unknown = expression
    if (value === 'reactive') {
      text = evaluate(expression)
    }
    // @ts-ignore
    tippy(el, { content: DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }) })
  })
});

Alpine.start();

export default {};
