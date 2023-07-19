const script = {
  name: 'load',

  exec: async function (ctx, payload) {
    console.log('-------payload', payload);

    if (payload.type === 'recipe') {
      let { recipeId, recipeVersion } = payload;
      const workflowIntegration = ctx.app.integrations.get('workflow');
      return await workflowIntegration.getWorkflow(
        recipeId,
        recipeVersion,
        ctx.user
      );
    } else if (payload.type === 'block') {
    }
  },
};

export default script;
