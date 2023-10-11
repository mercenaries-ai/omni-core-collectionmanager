/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

import { EObjectAction } from 'omni-shared'

const script = {
  name: 'delete',
  permission: async function (ctx, ability, payload) {
    const type = payload.type
    if(type === 'recipe') {
      const id = payload.id
      const integration = ctx.app.integrations.get('workflow');
      const workflow = await integration.getRecipe(payload.id, ctx.userId, false)
      if (!workflow || !ability.can(EObjectAction.DELETE, workflow)) {
        throw new Error ('Insufficient permissions to delete the recipe')
      }
    }
  },
  exec: async function (ctx, payload) {
    let type = payload.type || undefined;
    console.log(payload)
    if (type === 'recipe') {
        let result = false;
        const integration = ctx.app.integrations.get('workflow');
        const workflow =  await integration.getRecipe(payload.id, ctx.userId, false /*allowPublic: false*/)
        if (workflow) {
            result = await integration.deleteWorkflow(workflow)
            if(result) {
                const deletedItem = [workflow.id]
                return deletedItem;
            } else {
                console.error('Failed to delete the recipe')
                return null
            }
        }
        else {
            console.error('Failed to delete the recipe')
            return null
        }
    } else if (type === 'block') {
        console.log('delete block')
        /*
      const opts = { contentMatch: filter, tags: '' };
      let items = blockManager.getFilteredBlocksAndPatches(limit, cursor, filter, opts);
      if (items != null && Array.isArray(items) && items.length > 0) {
        items = items.map((n) => {
          return {
            value: { ...n },
            type: 'block',
          }
        });
        return { items }
      }
      // TODO handle when items is empty
      return { items: [{type: 'block'}] }
      */
    } else if (type === 'extension') {
        console.log('delete extension')
        
      // TODO
      /*
      const knownFilePath = path.join(process.cwd(), 'etc', 'extensions', 'known_extensions.yaml')
      const knownFileContents = await fs.readFile(knownFilePath, 'utf8')
      const knownFile = yaml.load(knownFileContents)
      const knownKeys =knownFile.known_extensions.map(k=>k.id)


      const privateExtensions =ctx.app.extensions.all().map(e=>JSON.parse(JSON.stringify({...e.config} ))).filter(e=>!knownKeys.includes(e.id))
      console.log(privateExtensions)

      const allExtensions = knownFile.known_extensions.concat(privateExtensions).sort((a,b)=>a.title.localeCompare(b.title))


      const items = allExtensions.filter(e=>!e.deprecated && e.title.toLowerCase().includes(filter)).map(e => {
        if(ctx.app.extensions.has(e.id)) {
          const extension = ctx.app.extensions.get(e.id)
          return {type: 'extension', value: {installed: `${ctx.app.extensions.has(e.id)}`, canOpen: `${extension.config.client?.addToWorkbench}`, id: `${e.id}`, title: `${e.title}`, description: `${extension.config.description}`, url: `${e.url}`, author: `${extension.config.author}`}};
        } else {

          return {type: 'extension', value: {installed: `${ctx.app.extensions.has(e.id)}`, id: `${e.id}`, title: `${e.title}`, description: `${e.description}`, url: `${e.url}`, author: `${e.author || 'Anonymous'}`}};
        }
      })
      return { items };
      */
    } else if (type === 'api') {
        console.log(payload.id)
        
    
        /*
      let items = blockManager.getAllNamespaces();
      if (items != null && Array.isArray(items) && items.length > 0) {
        items = items.map((n) => {
          return {
            value: { ...n },
            type: 'api',
          }
        });
        return { items }
      }
      */
    }
  },
};

export default script;
