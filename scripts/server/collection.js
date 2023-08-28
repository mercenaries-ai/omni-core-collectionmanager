import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
const script = {
  name: 'collection',

  exec: async function (ctx, payload) {
    let limit = payload.limit || 50;
    let cursor = payload.cursor || 0;
    let type = payload.type || undefined;
    let filter = payload.filter || '';
    const blockManager = ctx.app.blocks;

    if (type === 'recipe') {
      const workflowIntegration = ctx.app.integrations.get('workflow');
      const result = await workflowIntegration.getWorkflowsForUserPaginated(
        ctx.user,
        limit,
        0,
        cursor,
        true
      );
      const items = result.data.map((item) => {
        return {
          value: { ...item },
          type: 'recipe',
        };
      });
      return {
        items,
      };
    } else if (type === 'block') {
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
    } else if (type === 'extension') {
      // TODO
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
    } else if (type === 'api') {
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
    }
  },
};

export default script;
