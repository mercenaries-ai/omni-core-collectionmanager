
import Alpine from 'alpinejs'

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedImage is set, we hide the gallery and show the image full screen -----------------------
const args = new URLSearchParams(location.search)
const params = JSON.parse(args.get('q'))
let focusedImage = null
focusedImage = params?.focusedImage
let viewerMode = focusedImage ? true : false


const downloadImage = function(image) {

  let fid = image.ticket.fid
  const filename = image.fileName

  fetch('/fid/' + fid + '?download=true')
      .then(response => response.blob())
      .then(blob => {

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      })
      .catch(error => console.error(error));
}



const runExtensionScript = async (scriptName: string, payload: any) => {
  const response = await fetch('/api/v1/mercenaries/runscript/omni-core-filemanager:' + scriptName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  const data = await response.json();
    console.log(scriptName, data)
  return data
}



const copyToClipboardComponent = () => {
  return {
    copyText: '',
    copyNotification: false,

    async copyToClipboard(img) {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const data = [new ClipboardItem({ [blob.type]: blob })];
      await navigator.clipboard.write(data);
      //alert('Image copied to clipboard');
      //navigator.clipboard.writeText(this.copyText);
      this.copyNotification = true;
      let that = this;
      setTimeout(function () {
        that.copyNotification = false;
      }, 3000);
    }
  }
}



const createGallery = function (imagesPerPage: number, imageApi: string) {

  return {
    viewerMode: viewerMode,
    currentPage: 1,
    imagesPerPage: imagesPerPage,
    imageApi: imageApi,
    images: viewerMode ? [] : Array(imagesPerPage + 1).fill({ url: '/ph_250.png', meta: {} }),
    totalPages: () => Math.ceil(this.images.length / this.imagesPerPage),
    multiSelectedImages: [],

    cursor: null,
    showInfo: false,
    loading: false, // for anims
    scale: 1, // zoom
    x: 0, //pan
    y: 0,
    focusedImage: focusedImage || null,
    hover: false,

    async init() {

      await this.fetchImages({replace:true, limit: imagesPerPage})



    },
    async handleUpload(files: FileList){
      const uploaded = await this.uploadFiles(files)

      await this.fetchImages({replace:true, limit: imagesPerPage})


    },
    async runRecipeWith(runFiles: any[])
    {

      // Todo: this should be a generic function
      let files = Alpine.raw([...runFiles].filter(f => f?.mimeType.startsWith('image/') || f?.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg' || f.mimeType == 'application/pdf' || f.mimeType == 'application/x-pdf'))
      let images = files.filter(f => f?.mimeType.startsWith('image/'))
      let audio = files.filter(f => f?.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg')
      let documents = files.filter(f => f.mimeType == 'application/pdf' || f.mimeType == 'application/x-pdf')

      let args = {
        images, audio, documents,
      }

      //@ts-ignore
      window.parent.client.runScript('run', args)


    },
    async fileToDataUrl (file) {
      /* Encode content of file as https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs */
      return new Promise(function (resolve, reject) {
        /* Load file into javascript. */
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.readAsDataURL(file)
      })
    },
    async uploadFiles(files: FileList) {
      if (files?.length > 0) {
        let result = await Promise.all(
          Array.from(files).map(async (file) => {
            const form = new FormData();
            form.append('file', file, file.name || Date.now().toString());
            this.imageUrl = await this.fileToDataUrl(file);

            try {
              const response = await fetch('/fid', {
                method: 'POST',
                body: form,
              });

              if (response.ok) {
                const data = await response.json();

                if (data.length > 0 && data[0].ticket && data[0].ticket.fid) {
                  return data[0];
                } else {
                  console.warn('Failed to upload file', { data, file });
                  return null;
                }
              } else {
                console.warn('Failed to upload file', { response, file });
                return null;
              }
            } catch (error) {
              console.error('Failed to upload file', { error, file });
              return null;
            }
          })
        );

        result = result.filter((r) => r);
        return result;
      }

      return [];
    },
    getDisplayUrl(file, opts) {
      if (!file) {
        return '/404.png'
      }
      else if (file?.mimeType?.startsWith('audio/') || file.mimeType == 'application/ogg') {
        return '/audio.png'
      }
      else if (file?.mimeType?.startsWith('application/json') || file.mimeType == 'text/json') {
        return '/json.png'
      }

      else if (file?.mimeType?.startsWith('image/')) {

        if (opts && (opts.width || opts.height)) {
          let url = file.url
          // add all provided opts into query string using UrlSearchParams
          const params = new URLSearchParams()

          if (opts.height) params.set('height', opts.height)
          if (opts.width) params.set('width', opts.width)
          if (opts.fit) params.set('fit', opts.fit)
          url += '?' + params.toString()
          return url
        }

        return file.url
      }
      else  if (file?.meta?.type === 'recipe') {
        return '/recipe.png'
      }
      else {
        console.log(Alpine.raw(file))
        return '/ph_250.png'
      }
    },


    async addItems(images, replace = false)
    {

      let lastCursor = this.cursor
      if (images && images.length) {
        this.images = this.images.filter(item => item.onclick == null)

        images = images.map(f => {
          if (f.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg') {
            f.isAudio = true
          }
          return f
        })

        this.cursor = images[images.length - 1].seq
        if (replace) {
          this.images = images
        }
        else
        {
          this.images = this.images.concat(images)

        }


        if (this.images.length) {
          let self = this
          if (lastCursor != this.cursor || replace) {
            this.images.push({
              onclick: async () => {
                await self.fetchImages({ cursor: self.cursor })
              }, url: '/more.png', meta: {}
            })
          }
        }

        this.totalPages = Math.ceil(this.images.length / this.imagesPerPage);

      }
    },



    async fetchImages(opts?: { cursor?: string, limit?: number,  replace?: boolean}) {
      if (this.viewerMode) {
        return Promise.resolve()
      }

      const body: { limit: number, cursor?: string } = { limit: this.imagesPerPage }
      if (opts?.cursor) {
        body.cursor = opts?.cursor
      }
      if(opts?.limit && typeof(opts.limit) === 'number' &&  opts.limit > 0) {
        body.limit = Math.max(opts.limit,2)
      }
      const data = await runExtensionScript('files', body)

      this.addItems(data.images, opts?.replace)


    },
    selectImage(img) {
      if (img.onclick) {
        return
      }
      const idx = this.multiSelectedImages.indexOf(img);
      if (idx > -1) {
        this.multiSelectedImages.splice(idx, 1);  // Deselect the image if it's already selected
      } else {
        this.multiSelectedImages.push(img);  // Select the image
      }
    },
    paginate() {

      /*console.log('paginate')
      const start = (this.currentPage - 1) * this.imagesPerPage;
      const end = this.currentPage * this.imagesPerPage;
      return this.images.slice(start, end);*/
      return this.images
    },

    async nextImage() {
      const currentIndex = this.images.indexOf(this.focusedImage);
      if (currentIndex < this.images.length - 1) {
        await this.focusImage(this.images[currentIndex + 1]);
      }

    },

    animateTransition() {
      if (this.loading) {
        return
      }
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
      }, 200); // Adjust this delay as needed
    },

    async previousImage() {
      const currentIndex = this.images.indexOf(this.focusedImage);
      if (currentIndex > 0) {
        await this.focusImage(this.images[currentIndex - 1]);
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

    async focusImage(img) {
      this.animateTransition()
      this.x = 0
      this.y = 0
      this.scale = 1
      if (img.onclick != null) {
        await img.onclick.call(img)
        return
      }
      this.focusedImage = img;
      console.log('focusImage', img)
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },

    async sendToChat(img) {

      if (Array.isArray(img)) {
        //@ts-expect-error
        window.parent.client.sendSystemMessage(``, 'text/markdown', {
          images: img, commands: [
            { 'id': 'run', title: '🞂 Run', args: [null, img] }]
        }, ['no-picture'])
        this.multiSelectedImages = []
      }
      else {
        //@ts-expect-error
        window.parent.client.sendSystemMessage(``, 'text/markdown', {
          images: [{ ...img }], commands: [
            { 'id': 'run', title: '🞂 Run', args: [null, { ...img }] }]
        }, ['no-picture'])
      }

    },
    async exportImage(img) {

      const imageFid = img
      const action = 'export'
      let args = {}
      //@ts-ignore
      const workflow = await window.parent.client.workbench.toJSON()

      if (!workflow) {
        alert('No active workflow')
      }
      const payload = { imageFid, action, args, recipe:workflow }
      const resultImage = (<any>await runExtensionScript('export', payload)).image
      await downloadImage(resultImage)
      await this.fetchImages({replace:true, limit: imagesPerPage})


    },

    async importImage(img) {

      let args = {
        action: 'import',
        imageFid: img.ticket.fid,
      }
      const file = <any>(await runExtensionScript('export', args)).file
      console.log('import', file)
      window.parent.location.href = window.parent.location.protocol + "//" + window.parent.location.host + `/?rx=${encodeURIComponent(file.url)}`;


    },
    zoomImage(event) {
      // Determine whether the wheel was scrolled up or down
      const direction = event.deltaY < 0 ? 0.1 : -0.1;

      // Get the current scale of the image
      const currentScale = this.$refs.zoomImg.style.transform || 'scale(1)';
      const currentScaleValue = parseFloat(currentScale.slice(6, -1));

      // Calculate the new scale
      const newScale = Math.min(Math.max(0.75, currentScaleValue + direction), 5.0);
      this.scale = newScale

      // Set the new scale
      this.$refs.zoomImg.style.transform = `scale(${newScale})`;
    },
    async deleteByFid(img) {
      console.log('delete', img)
      if (!Array.isArray(img)) {
        img = [img]
      }

      if (img.length > 1)
      {
        if (!confirm(`Are you sure you want to delete ${img.length} items?`)) {
          return
        }
      }

      let data = await runExtensionScript('delete', {delete: img})

      if (!data.ok) {
        //@ts-expect-error
        window.parent.client.sendSystemMessage('Failed to delete image(s) ' + data.reason, 'text/plain', {}, ['error'])
        return
      }

      this.multiSelectedImages = []
      if (data.deleted) {

        this.images = this.images.filter(img => {
          console.log(img)
          if (img.onclick != null) return true

          let deleted = data.deleted.includes(img.ticket.fid)
          return !deleted
        })

        if (this.focusedImage) {
          if (data.deleted.includes(this.focusedImage.ticket.fid)) {
            this.focusedImage = null
            // In viewer mode, we close the extension if the focused image is deleted
            if (this.viewerMode === true) {
              //@ts-expect-error
              window.parent.client.workbench.hideExtension()
            }
          }
        }

        await this.fetchImages({cursor: this.cursor, limit: data.deleted.length})

      }

    }
  }

}





window.Alpine = Alpine
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    copyToClipboardComponent,
    createGallery,
    async copyToClipboard(imgUrl) {
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const data = [new ClipboardItem({ [blob.type]: blob })];
        await navigator.clipboard.write(data);
        alert('Image copied to clipboard');
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


  }

  ))

}
)




Alpine.start()




export default {}