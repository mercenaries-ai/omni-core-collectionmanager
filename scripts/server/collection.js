const script = {
  name: 'collection',

  exec: async function (ctx, payload) {
    let limit = payload.limit || 50;
    let cursor = payload.cursor || undefined;
    let type = payload.type || undefined;

    console.log('collection', payload, limit, cursor, type);

    const items = [
      {
        type: 'recipe',
        id: '1',
        value: {
          name: '!Torture Test',
          owner: 'mercenaries.ai',
          pictureUrl: 'trouble.png',
          description: 'Everything, everywhere, all at once.',
          aiUsage: '',
          id: '8537d258-5396-499a-88c7-2035051933e1',
          canDelete: true,
          starred: false,
        },
      },
      {
        type: 'recipe',
        id: '2',
        value: {
          name: 'Alfred the LLM Butler',
          owner: 'mercenaries.ai',
          pictureUrl: 'butler.png',
          description:
            'A simple ChatGPT workflow for use with the /setname command for quick text generation',
          aiUsage: '',
          id: 'edcd3e18-57b7-4046-8a05-1dd3879c3fcb',
          canDelete: true,
          starred: false,
        },
      },
      {
        type: 'recipe',
        id: '3',
        value: {
          name: "Andrea the Children's Book Author",
          owner: 'mercenaries.ai',
          pictureUrl: 'librarian.png',
          description:
            "An assistant that creates art and audio for children's books based on user input.",
          aiUsage: '',
          id: '750d1a3a-1c94-4bc6-bb02-d93e6aff2ac7',
          canDelete: true,
          starred: false,
        },
      },
    ];
    return {
      items,
    };
  },
};

export default script;
