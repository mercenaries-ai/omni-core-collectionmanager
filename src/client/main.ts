import Alpine from 'alpinejs'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import DOMPurify from 'dompurify'
import {OmniSDKClient} from 'omni-sdk';

const sdk = new OmniSDKClient("omni-core-collectionmanager").init();

declare global {
  interface Window {
    Alpine: typeof Alpine
  }
}
type CollectionType = 'block' | 'recipe' | 'extension';

interface BaseCollectionValue {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  starred: boolean;
  setData: (type: CollectionType, data: Partial<Recipe & Extension & Block>) => void;
}

interface Recipe extends BaseCollectionValue {
  author: string;
  pictureUrl: string;
  canDelete: boolean;
  created: Date | null;
  updated: Date | null;
  deleted: boolean;
  createdDate: string | null;
  updatedDate: string | null;
}

interface Extension extends BaseCollectionValue {
  author: string;
  installed: boolean;
  canOpen: boolean;
}

interface Block extends BaseCollectionValue {
  // ... (any attributes unique to Block)
}

type CollectionValue = Recipe | Extension | Block;
type CollectionItem = { type: CollectionType; value: CollectionValue; };

// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const args = new URLSearchParams(location.search);
const params = sdk.args
let focusedItem = null;
focusedItem = params?.focusedItem;
let viewerMode = focusedItem ? true : false;
let type = params?.type;
let filter = params?.filter;

const getFavoriteKey = function (type: CollectionType, data: any) {
  let key = 'fav-' + type;
  if (type === 'block') {
    key += data.name;
  } else {
    key += data.id;
  }
  return key;
}

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
    favOnly: false,
    calculateCursor() {
      if(this.type === 'block') {
        this.cursor = this.items[this.items.length-1].value.id;
      } else {
        this.cursor = this.items.length;
      }
    },
    async init() {
      await this.fetchItems({ replace: true, limit: itemsPerPage, cursor: 0 });
    },

    async addItems(items: Array<CollectionItem>, replace = false) {
      if(this.favOnly) {
        items = items.filter((item) => {
          const key = getFavoriteKey(item.type, item.value)
          return window.localStorage.getItem(key) ? true : false;
        });
      }
      if (replace) {
        console.log('replace items', this.items, items)
        this.items = items;
      } else {
        this.items = this.items.concat(items);
      }
      this.calculateCursor();
    },
    async loadMore() {
      if(this.currentPage === this.totalPages) {
        console.log('This is the last page')
        return;
      }
      const body: { limit: number, cursor: number, type: CollectionType, filter: string } = {
        limit: this.itemsPerPage,
        type: this.type,
        cursor: this.cursor,
        filter: this.search
      };
      const data = await sdk.runExtensionScript('collection', body);
      this.addItems(data.items, false);
      this.totalPages = data.totalPages;
      this.currentPage = data.currentPage;
      this.calculateCursor();
      
    },
    async fetchItems(opts?: {
      cursor?: number;
      limit?: number;
      replace?: boolean;
    }) {
      if (this.viewerMode) {
        return Promise.resolve();
      }
      const body: { limit: number; cursor: number; type: CollectionType; filter: string } = {
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

    mouseEnter() {
      this.hover = true;
    },
    mouseLeave() {
      this.hover = false;
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
    async update(item, type: CollectionType) {
      if (type == 'extension') {
        sdk.runClientScript('extensions',['update', item.value.id]);
      }
    },
    async toggleFavorite(item, type: CollectionType) {
      const key = getFavoriteKey(type, item.value)
      window.localStorage.getItem(key) ? window.localStorage.removeItem(key) : window.localStorage.setItem(key, 'true');
      this.starred = !this.starred
      item.value.starred = this.starred
    },
    async clickToAction(item, type: CollectionType) {
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
    setData(type, data) {
      this.id = data.id;
      this.name = data.meta?.name ?? data.name;
      this.title = data.meta?.title ?? data.title;
      this.description = data.meta?.description ?? data.description;
      this.pictureUrl = data.meta?.pictureUrl ?? data.pictureUrl;
      this.type = type;
      this.category = data.category;
      this.author = data.meta?.author ?? data.author;
      this.tags = data.meta?.tags ?? data.tags;

      const key = getFavoriteKey(type, data)
      this.starred = window.localStorage.getItem(key) ? true : false;
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
      const body: { limit: number; cursor: number; type: CollectionType; filter: string } = {
        limit: this.itemsPerPage,
        type: this.type,
        cursor: 0,
        filter: this.search
      };
      const data = await sdk.runExtensionScript('collection', body);
      this.addItems(data.items, true);
      this.calculateCursor();
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
