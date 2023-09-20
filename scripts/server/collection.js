import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

const getKnownFile = async () => {
  try {
    const knownFilePath = path.join(process.cwd(), 'etc', 'extensions', 'known_extensions.yaml');
    const knownFileContents = await fs.readFile(knownFilePath, 'utf8');
    return yaml.load(knownFileContents);
  } catch (error) {
    console.error('Error reading the known file:', error);
    throw error;
  }
};

const getPrivateExtensions = (allExtensions, knownKeysSet) => {
  return allExtensions
    .map(({ config }) => ({ ...config }))
    .filter(({ id }) => !knownKeysSet.has(id));
};

const getAllExtensions = (knownFile, privateExtensions) => {
  return knownFile.known_extensions
    .concat(privateExtensions)
    .sort((a, b) => a.title.localeCompare(b.title));
};

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
      const page = parseInt(cursor / limit);
      const result = await workflowIntegration.getWorkflowsForUserPaginatedV2(
        ctx.user.id,
        true,
        limit,
        page,
        filter
      );
      if(result.data.length === 0) {
        console.log('no result')
        return {items: []}
      }
      const items = result.data.map((item) => {
        return {
          value: { ...item },
          type: 'recipe',
          currentPage: page,
          totalPages: result.totalPage,
        };
      });
      return {
        items,
      };
    } else if (type === 'block') {
      const opts = { contentMatch: filter, tags: '' };
      let items = blockManager.getFilteredBlocksAndPatches(limit, cursor, filter, opts);
      console.log(items)
      if (items != null && Array.isArray(items) && items.length > 0) {
        items = items.map((n) => {
          return {
            value: { ...n[1], id: n[0] },
            type: 'block',
          }
        });
        return { items }
      }
      // TODO handle when items is empty
      return { items: [{type: 'block'}] }
    } else if (type === 'extension') {
      // TODO
      const knownFile = await getKnownFile();
      const knownKeysSet = new Set(knownFile.known_extensions.map(k => k.id));
      const allExtensions = ctx.app.extensions.all().filter(e => e.config.client?.addToWorkbench);
      const privateExtensions = getPrivateExtensions(allExtensions, knownKeysSet);
      const allExtensionsSorted = getAllExtensions(knownFile, privateExtensions);
      const items = allExtensionsSorted.filter(e=>!e.deprecated && e.title.toLowerCase().includes(filter)).map(e => {
        if(ctx.app.extensions.has(e.id)) {
          const extension = ctx.app.extensions.get(e.id)

          return {type: 'extension', value: {installed: ctx.app.extensions.has(e.id), canOpen: extension.config.client?.addToWorkbench, id: `${e.id}`, title: `${e.title}`, description: `${extension.config.description}`, url: `${e.url}`, author: `${extension.config.author}`}};
        } else {

          return {type: 'extension', value: {installed: ctx.app.extensions.has(e.id), id: `${e.id}`, title: `${e.title}`, description: `${e.description}`, url: `${e.url}`, author: `${e.author || 'Anonymous'}`}};
        }
      })
      // sort items to put installed extensions first
      items.sort((a,b)=>a.value.installed === b.value.installed ? 0 : a.value.installed ? -1 : 1)
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
