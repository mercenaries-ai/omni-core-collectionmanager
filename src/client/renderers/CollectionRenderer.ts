abstract class CollectionRenderer {
  constructor() {}
  abstract render(content: { type: string; value: any }): string;
}

export default CollectionRenderer
