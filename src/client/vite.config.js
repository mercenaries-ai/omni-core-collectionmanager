/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

// vite.config.js
import handlebars from 'vite-plugin-handlebars'
import path from 'path'

function handlebarsOverride (options) {
  const plugin = handlebars(options)
  // Currently handleHotUpdate skips further processing, which bypasses
  // postcss and in turn tailwind doesn't pick up file changes
  delete plugin.handleHotUpdate
  return plugin
}

const config = {
  base: '/extensions/omni-core-collectionmanager/',
  plugins: [handlebarsOverride({
    reloadOnPartialChange: true,
    partialDirectory: [path.resolve(__dirname,'./templates/')]
  })],

  build: {
    outDir: '../../public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      }
    }
  },

  resolve: {
    alias: {
    }
  },
}

export default config
