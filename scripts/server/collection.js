const script = {
  name: 'collection',

  exec: async function (ctx, payload) {
    let limit = payload.limit || 50;
    let cursor = payload.cursor || '';
    let type = payload.type || undefined;

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

      // TODO
      
    } else if (type === 'extension') {
      const allExtensions = ctx.app.extensions.all()
      const items = allExtensions.map((item) => {
        return {
          value: item.id,
          type: 'extension',
        };
      });
      return {items,};
    }
  },
};

export default script;
