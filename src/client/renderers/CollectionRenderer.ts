/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

abstract class CollectionRenderer {



  constructor() {}
  abstract render(content: { type: string; value: any }): string;
}

export default CollectionRenderer
