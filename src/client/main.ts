import Alpine from 'alpinejs';
import './style.scss';
import { createContext } from 'vm';
declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const args = new URLSearchParams(location.search);
const params = JSON.parse(args.get('q'));
let focusedItem = null;
focusedItem = params?.focusedItem;
let viewerMode = focusedItem ? true : false;
let type = params?.type;
let filter = params?.filter;

const runExtensionScript = async (scriptName: string, payload: any) => {
  const response = await fetch(
    '/api/v1/mercenaries/runscript/omni-core-collectionmanager:' + scriptName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  console.log('runExtensionScript response', response);
  const data = await response.json();
  console.log(scriptName, data);
  return data;
};


const runServerScript = async (scriptName: string, payload: any) => {
  const response = await fetch(
    '/api/v1/mercenaries/runscript/' + scriptName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  console.log('runServerScript response', response);
  const data = await response.json();
  console.log(scriptName, data);
  return data;
};


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
    currentPage: 1,
    itemsPerPage: itemsPerPage,
    itemApi: itemApi,
    items: viewerMode
      ? []
      : Array(itemsPerPage + 1).fill({ url: '/ph_250.png', meta: {} }),
    totalPages: () => Math.ceil(this.items.length / this.itemsPerPage),
    multiSelectedItems: [],

    cursor: null,
    showInfo: false,
    loading: false, // for anims
    scale: 1, // zoom
    x: 0, //pan
    y: 0,
    focusedItem: focusedItem || null,
    hover: false,

    async init() {
      await this.fetchItems({ replace: true, limit: itemsPerPage, cursor: '' });
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
    getDisplayUrl(item, opts) {
      if (!item) {
        return '<img src="/ph_250.png" />';
      } else {
        //@ts-expect-error
        const renderer = window.parent.client.collectionRenderers.get(item.type);

        if (renderer) {
          return renderer.render(item.value);  
        } else {
          return '<img src="/ph_250.png" />';
        }
     }
    },

    async addItems(items, replace = false) {
      let lastCursor = this.cursor;
      if (items && items.length) {
        this.items = this.items.filter((item) => item.type !== 'load-more');
        this.cursor = this.items.length;
        if (replace) {
          this.items = items;
        } else {
          this.items = this.items.concat(items);
        }

        if (this.items.length) {
          let self = this;
          if (lastCursor != this.cursor || replace) {
            this.items.push({
              type: 'load-more',
              value: {cursor: self.cursor}
            });
          }
        }

        this.totalPages = Math.ceil(this.items.length / this.itemsPerPage);
      }
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
      const data = await runExtensionScript('collection', body);

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
      return this.items.slice(this.cursor, this.cursor + this.itemsPerPage);
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
      const file = <any>(await runExtensionScript('export', args)).file;
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
    async deleteByFid(item) {
      console.log('delete', item);
      if (!Array.isArray(item)) {
        item = [item];
      }

      if (item.length > 1) {
        if (!confirm(`Are you sure you want to delete ${item.length} items?`)) {
          return;
        }
      }

      let data = await runExtensionScript('delete', { delete: item });

      if (!data.ok) {
        //@ts-expect-error
        window.parent.client.sendSystemMessage(
          'Failed to delete item(s) ' + data.reason,
          'text/plain',
          {},
          ['error']
        );
        return;
      }

      this.multiSelectedItems = [];
      if (data.deleted) {
        this.items = this.items.filter((item) => {
          console.log(item);
          if (item.onclick != null) return true;

          let deleted = data.deleted.includes(item.fid);
          return !deleted;
        });

        if (this.focusedItem) {
          if (data.deleted.includes(this.focusedItem.fid)) {
            this.focusedItem = null;
            // In viewer mode, we close the extension if the focused item is deleted
            if (this.viewerMode === true) {
              //@ts-expect-error
              window.parent.client.workbench.hideExtension();
            }
          }
        }

        await this.fetchItems({
          cursor: this.cursor,
          limit: data.deleted.length,
        });
      }
    },
    async clickToAction(item, type: string) {
      if (type === 'recipe') {
        //@ts-expect-error
        await window.parent.client.workbench.loadWorkflow(item.value.id, item.value.version);
        //@ts-expect-error
        window.parent.client.workbench.hideExtension();
      }
      else if (type == 'block') {
        //@ts-expect-error
        await window.parent.client.runScript('add', [item.value.name]);
      }
      else if (type == 'extension') {
        if (item.value.installed === 'true') {
          //@ts-expect-error
          window.parent.client.workbench.showExtension(item.value.id);
        } else {
          //@ts-expect-error
          window.parent.client.runScript('extensions',['add', item.value.url]);
        }
      }
     
    }
  };
};

function orderByName(a, b) {
  const name_a = a.value?.meta?.name?.toLowerCase() || a.value?.name?.toLowerCase();
  const name_b = b.value?.meta?.name?.toLowerCase() || b.value?.name?.toLowerCase();
  if (name_a > name_b) {
    return 1;
  } else if (name_a < name_b) {
    return -1;
  } else {
    return 0;
  }
}

window.Alpine = Alpine;
document.addEventListener('alpine:init', async () => {
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
    get filteredItems () {
      const search = this.search.replace(/ /g, '').toLowerCase()
      if (search === '') {
        return this.items;
      }
      return this.items.filter((c) => {
        const nameMatches =
          c.value?.meta?.name?.replace(/ /g, '').toLowerCase().includes(search)  || 
          c.value?.name?.replace(/ /g, '').toLowerCase().includes(search)
        const titleMatches =
          c.value?.meta?.title?.replace(/ /g, '').toLowerCase().includes(search) ||
          c.value?.title?.replace(/ /g, '').toLowerCase().includes(search)
        const descriptionMatches =
          c.value?.meta?.description?.replace(/ /g, '').toLowerCase().includes(search) || 
          c.value?.description?.replace(/ /g, '').toLowerCase().includes(search)
        const summaryMatches =
          c.value?.meta?.summary?.replace(/ /g, '').toLowerCase().includes(search) ||
          c.value?.summary?.replace(/ /g, '').toLowerCase().includes(search)
        const categoryMatches =
          c.value?.meta?.category?.replace(/ /g, '').toLowerCase().includes(search) || 
          c.value?.category?.replace(/ /g, '').toLowerCase().includes(search)
        return (
          nameMatches ||
          titleMatches ||
          descriptionMatches ||
          summaryMatches ||
          categoryMatches
        )
      })
    },
  }));
});

Alpine.start();

export default {};
