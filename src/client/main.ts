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
        return '<img src="/404.png" />';
      } else {
        //@ts-expect-error
        const renderer = window.parent.client.collectionRenderers.get(item.type);
        if (renderer) {
            return renderer.render(item.value);
        } else {
            return '<img src="/404.png" />';
        }
     }
    },

    async addItems(items, replace = false) {
      let lastCursor = this.cursor;
      if (items && items.length) {
        this.items = this.items.filter((item) => item.onclick == null);
        this.cursor = items[items.length - 1].seq;
        if (replace) {
          this.items = items;
        } else {
          this.items = this.items.concat(items);
        }

        if (this.items.length) {
          let self = this;
          if (lastCursor != this.cursor || replace) {
            this.items.push({
              onclick: async () => {
                await self.fetchItems({ cursor: self.cursor });
              },
              url: '/more.png',
              meta: {},
            });
          }
        }

        this.totalPages = Math.ceil(this.items.length / this.itemsPerPage);
      }
    },

    async fetchItems(opts?: {
      cursor?: string;
      limit?: number;
      replace?: boolean;
    }) {
      if (this.viewerMode) {
        return Promise.resolve();
      }
      const body: { limit: number; bookmark: string; type: string } = {
        limit: this.itemsPerPage,
        type: 'recipe',
        bookmark: '',
      };
      if (opts?.cursor) {
        body.bookmark = opts?.cursor;
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
      /*console.log('paginate')
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = this.currentPage * this.itemsPerPage;
      return this.items.slice(start, end);*/
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
        itemFid: item.ticket.fid,
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

          let deleted = data.deleted.includes(item.ticket.fid);
          return !deleted;
        });

        if (this.focusedItem) {
          if (data.deleted.includes(this.focusedItem.ticket.fid)) {
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
      console.log(item)
      if (type === 'recipe') {
        //@ts-expect-error
        await window.parent.client.workbench.loadWorkflow(item.value.id, item.value.version);
      }
     //@ts-expect-error
     window.parent.client.workbench.hideExtension();
    }
  };
};

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
  }));
});

Alpine.start();

export default {};
