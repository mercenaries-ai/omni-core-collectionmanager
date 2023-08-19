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
      let start = cursor;
      let end = cursor+limit;
      const opts = { filter: filter };
      let items = blockManager.getFilteredBlocksAndPatches(opts);
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
      const allExtensions = ctx.app.extensions
        .all()
        .filter(
          (e) =>
            e.id !== 'omni-core-filemanager'
        );
      const items = allExtensions.map((item) => {
        return {
          value: { ...item.config },
          type: 'extension',
        };
      });
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
