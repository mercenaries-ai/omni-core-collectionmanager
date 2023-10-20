/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

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
type CollectionType = 'block' | 'recipe' | 'extension' | 'api';

interface BaseCollectionValue {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  starred: boolean;
  setData: (type: CollectionType, data: Partial<Recipe & Extension & Block & Api>) => void;
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
  isCore: boolean;
  isLocal: boolean;
  url: string;
}

interface Block extends BaseCollectionValue {
  // ... (any attributes unique to Block)
}

interface Api extends BaseCollectionValue {
  namespace: string;
  basePath: string;
  signUpUrl: string;
  url: string;
  key: Map<string, string>;
}

type CollectionValue = Recipe | Extension | Block | Api;
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

const createGallery = function (itemsPerPage: number, itemApi: string) {
  return {
    type: type,
    viewerMode: viewerMode,
    currentPage: 0,
    itemsPerPage: itemsPerPage,
    itemApi: itemApi,
    items: new Array<CollectionItem>(),
    shadow: new Array<CollectionItem>(),
    totalPages: 1,
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
    async init() {
      await this.loadMore()
    },
    openChat(item: CollectionItem) {
      if (item.type === 'recipe')
      {
        //@ts-ignore
        sdk.showExtension('omni-extension-wa-chat-ui', { chat:{id: item.value.id, name: item.value.meta.name, description: item.value.meta.description, image: this.getIconPath(item) }});
        sdk.close();
      }
    },

    openFormIO(item: CollectionItem) {
      if (item.type === 'recipe')
      {
        sdk.showExtension(
          'omni-extension-formio',
          { recipe: { id: item.value.id, version: undefined } },
          'render',
          {
            singletonHash: 'formio-' + item.value.id,
            winbox: {
               //@ts-ignore
              title: '▶️' + item.value.meta.name,
              x: 'center',
              y: 'center',
              minheight: 500,
              minwidth: 600,
              autosize: true
            },
            hideToolbar: true
          }
        );
       sdk.close();
      }
    },
    close() {
      sdk.close();
    },

    prepareFromShadow() {
      this.items = [...this.shadow]
      if(this.favOnly) {
        this.items = this.items.filter((item) => {
          const key = getFavoriteKey(item.type, item.value)
          return window.localStorage.getItem(key) ? true : false;
        });
      }
    },
    async addAsBlock(id: string) {
      return await sdk.runClientScript('add', ["omnitool.loop_recipe", {recipe_id: id}]);
    },

    async addItems(items: Array<CollectionItem>, replace = false) {
      if (replace) {
        this.items = new Array<CollectionItem>()
        this.shadow = new Array<CollectionItem>()
        this.cursor = 0
      }

      if(items.length === 1 && items[0].type === 'block' && Object.keys(items[0]).length === 1) {
        // Special case, items is actually empty
        items = []
      }

      this.cursor += items.length

      this.shadow = this.shadow.concat(items);
      this.prepareFromShadow()
    },
    async loadMore(replace = false) {
      await this.fetchItems(replace)
    },
    async fetchItems(replace = false) {
      if (this.viewerMode) {
        return Promise.resolve();
      }

      let limit = this.itemsPerPage;
      if (type !== 'recipe') {
        limit += 1 // One extra to see if we are at the end of the collection.
      }
      const body: { limit: number; cursor: number; type: CollectionType; filter: string } = {
        limit,
        type: this.type,
        cursor: replace ? 0 : this.cursor,
        filter: this.search,
      };
      const data = await sdk.runExtensionScript('collection', body);
      this.addItems(data.items.slice(0, this.itemsPerPage), replace);

      if (data.hasOwnProperty('currentPage')) {
        this.currentPage = data.currentPage
      } else {
        this.currentPage += 1
      }
      if (data.hasOwnProperty('totalPages')) {
        this.totalPages = data.totalPages
      } else {
        this.totalPages = (data.items.length === limit) ? this.currentPage + 1 : this.currentPage
      }
    },
    selectItem(item: CollectionItem, event?: MouseEvent) {
      if (item.onclick) {
        return;
      }
      const idx = this.multiSelectedItems.indexOf(item);
      if (idx > -1) {
        this.multiSelectedItems.splice(idx, 1); // Deselect the item if it's already selected
      } else {
        if (event && event.type === 'contextmenu') { // multi select
          this.multiSelectedItems.push(item);
        } else if (event && event.type === 'click') { // select
          this.multiSelectedItems = [item];
        }
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

    async deleteItemList(itemList: Array<CollectionItem>) {
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
    async update(item: CollectionItem, type: CollectionType) {
      if (type == 'extension') {
        sdk.runClientScript('extensions',['update', item.value.id]);
      }
    },
    getIconPath(item: CollectionItem) {
      if (item.type === 'recipe') {
        if (item.value.meta.pictureUrl)
        {
          return '/extensions/omni-core-recipes/assets/recipe-cover/'+ item.value.meta.pictureUrl;
        }
        else
        {
          return '/omni.png';
        }
      } else if (item.type === 'extension') {
        return '/extensions/'+item.value.id+'/logo.png';
      } else if (item.type === 'block') {
        const names = item.value?.name?.split('.')
        if (names && names.length > 1 ) {
          if (names[0].includes(':')) {
            return '/extensions/'+ names[0].split(':')[0]+'/logo.png';
          } else {
            return '/logos/'+ names[0]+'.png';
          }
        }
        return null;
      } else if (item.type === 'api') {
        return '/logos/'+ item.value.namespace + '.png';
      }
    },
    async toggleFavorite(item: CollectionItem, type: CollectionType) {
      const key = getFavoriteKey(type, item.value)
      sdk.runClientScript('toggleFavorite', [key])
      item.value.starred = window.localStorage.getItem(key) !== null // Toggle.
      if (this.favOnly) {
        this.prepareFromShadow() // `item` is no longer visible!
      }

      // TODO: The next line isn't part of the toggle logic, but appears to trigger the redraw as a side-effect.
      // Don't remove it without adding the redraw back in.
      this.starred = !this.starred
    },
    async clickToAction(item: CollectionItem, type: CollectionType) {
      switch (type) {
        case 'recipe':
          // Assuming the error here is known and is because of external typings
          await sdk.openRecipeInEditor(item.value.id, item.value.version);
          sdk.close();
          break;

        case 'block':
          console.log(await sdk.runClientScript('add', [item.value.name]));
          break;

        case 'extension':
          if (item.value.installed) {
            sdk.signalIntent("show", item.value.id);
          } else {
            await sdk.runClientScript('extensions', ['add', item.value.url]);
          }
          break;

        case 'api':
          if (this.hasKey) {
            this.hasKey = !this.hasKey // Toggle on click
            const response = await sdk.runClientScript('revokeKey', [this.namespace, this.key.id]);
            this.hasKey = !response.answer // Set to server value
          } else {
            this.hasKey = !this.hasKey // Toggle on click
            const response = await sdk.runClientScript('setKey', [this.namespace, this.key.id, this.key.secret]);
            this.hasKey = response.answer // Set to server value
          }
          break;

        // Optional: Add a default case if there's a possibility of unknown types.
        default:
          console.error(`Unknown type: ${type}`);
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
    namespace: '',
    basePath: '',
    signUpUrl: '',
    url: '',
    key: null,
    hasKey: false,
    setData(type, data) {
      this.id = data.id;
      this.name = data.meta?.name ?? data.name;
      this.title = data.meta?.title ?? data.title;
      this.description = data.meta?.description ?? data.description;
      this.pictureUrl = data.meta?.pictureUrl ?? data.pictureUrl;
      this.type = type;
      this.category = data.category ?? data.meta?.category;
      this.author = data.meta?.author ?? data.author;
      if(type === 'block') {
        this.tags = data.name?.split('.');
      } else {
        this.tags = data.meta?.tags ?? data.tags;
      }

      const key = getFavoriteKey(type, data)
      this.starred = window.localStorage.getItem(key) ? true : false;
      this.canDelete = data.canDelete;
      this.created = data.meta?.created;
      this.updated = data.meta?.updated;
      this.installed = data.installed;
      this.canOpen = data.canOpen;

      this.namespace = data.namespace;
      this.basePath = data.api?.basePath;
      this.signUpUrl = data.signUpUrl;
      this.key = data.key;
      this.hasKey = data.hasKey;
      this.url = data.url;
    },
    get createdDate() {
      return this.created ? new Date(this.created).toLocaleString() : null;
    },
    get updatedDate() {
      return this.updated ? new Date(this.updated).toLocaleString() : null;
    }

  }));

  Alpine.data('appState', () => ({
    createGallery,
    search: filter || '',
    filterOption: '',
    needRefresh: false,
    async refresh() {
      await this.loadMore(true)
      this.multiSelectedItems=[]
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async applyFilter() {
      await this.refresh()
      if (this.filterOption === 'Favorites') {
        this.items = this.items.filter((item) => {
          const key = getFavoriteKey(item.type, item.value)
          return window.localStorage.getItem(key) ? true : false;
        });
      } else if (this.filterOption === 'Template') {
        this.items = this.items.filter((item) => {
          return item.value.meta?.template ? true : false;
        });
      } else if (this.filterOption === 'All') {
        // Do nothing
      }
    },
    async filteredItems () {
      this.needRefresh = false
      await this.loadMore(true)
      return this.items
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
