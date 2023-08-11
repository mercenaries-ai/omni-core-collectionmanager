const script = {
  name: 'collection',

  exec: async function (ctx, payload) {
    let limit = payload.limit || 50;
    let cursor = payload.cursor || '';
    let type = payload.type || undefined;
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
      let items = blockManager.getFilteredBlocksAndPatches();
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
            e.id !== 'omni-core-filemanager' && e.config?.client?.addToWorkbench
        );
      const items = allExtensions.map((item) => {
        return {
          value: { ...item.config },
          type: 'extension',
        };
      });
      return { items };
    } else if (type === 'namespace') {
      let items = blockManager.getAllNamespaces();
      if (items != null && Array.isArray(items) && items.length > 0) {
        items = items.map((n) => {
          return {
            value: { ...n.name },
            type: 'namespace',
          }
        });
        return { items }
      }
    }
  },
};

export default script;
