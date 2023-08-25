import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
const script = {
  name: 'collection',

  exec: async function (ctx, payload) {
    let limit = payload.limit || 50;
    let cursor = payload.cursor || 0;
    let type = payload.type || undefined;
    let filter = payload.filter?.toLowerCase() || '';
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
      const opts = { filter: filter };
      let items = blockManager.getFilteredBlocksAndPatches(limit, cursor, opts);
      if (items != null && Array.isArray(items) && items.length > 0) {
        items = items.map((n) => {
          return {
            value: { ...n },
            type: 'block',
          }
        });
        return { items }
      }
    } else if (type === 'extension') {
      // TODO
      const knownFilePath = path.join(process.cwd(), 'etc', 'extensions', 'known_extensions.yaml')
      const knownFileContents = await fs.readFile(knownFilePath, 'utf8')
      const knownFile = yaml.load(knownFileContents)
      
      const items = knownFile.known_extensions.filter(e=>!e.deprecated && e.title.toLowerCase().includes(filter)).map(e => {
        if(ctx.app.extensions.has(e.id)) {
          const extension = ctx.app.extensions.get(e.id)
          return {type: 'extension', value: {installed: `${ctx.app.extensions.has(e.id)}`, id: `${e.id}`, title: `${e.title}`, description: `${extension.config.description}`, url: `${e.url}`, author: `${extension.config.author}`}};
        } else {

          return {type: 'extension', value: {installed: `${ctx.app.extensions.has(e.id)}`, id: `${e.id}`, title: `${e.title}`, description: `${e.description}`, url: `${e.url}`, author: `${e.author}`}};
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
