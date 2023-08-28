import CollectionRenderer from './CollectionRenderer';

import axios from 'axios';


class RecipeRenderer extends CollectionRenderer {


  render(content: any): string {


    // Hacks! Fix me!
    (window.parent as any).clickDeleteRecipe = function(item: any) {
      const recipe = item.value;
      console.log(`attempt to delete recipe`, recipe.id);
      axios.delete("/api/v1/workflow/" + recipe.id, {
        withCredentials: true,
      });

      // redraw etc..
    };


    const imageUrl = content.meta.pictureUrl;
    const title = content.meta.name;
    const description = content.meta.description;
    const canDelete = content?.canDelete ?? true;
    const starred = content?.starred ?? false;
    return `<div class="collection-recipe">
    <div class="collection-recipe-header">
<div class="collection-fav" @click="clickToAction(item, 'toggleRecipeStar')">
<svg x-show="!${starred}" xmlns="http://www.w3.org/2000/svg" width="17" height="15" viewBox="0 0 17 15" fill="none">
<path d="M2.1095 7.70617L8.5 14.3333L14.8905 7.70617C15.6009 6.96942 16 5.97024 16 4.92838C16 2.75879 14.304 1 12.2119 1C11.2073 1 10.2437 1.41388 9.53333 2.15059L8.5 3.22222L7.46667 2.15059C6.75624 1.41388 5.79273 1 4.78807 1C2.69597 1 1 2.75879 1 4.92838C1 5.97024 1.3991 6.96942 2.1095 7.70617Z" stroke="#505050" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<svg x-show="!!${starred}" xmlns="http://www.w3.org/2000/svg" width="17" height="15" viewBox="0 0 17 15" fill="red">
<path d="M2.1095 7.70617L8.5 14.3333L14.8905 7.70617C15.6009 6.96942 16 5.97024 16 4.92838C16 2.75879 14.304 1 12.2119 1C11.2073 1 10.2437 1.41388 9.53333 2.15059L8.5 3.22222L7.46667 2.15059C6.75624 1.41388 5.79273 1 4.78807 1C2.69597 1 1 2.75879 1 4.92838C1 5.97024 1.3991 6.96942 2.1095 7.70617Z" stroke="#505050" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</div>
    </div>
  <div class="collection-recipe-cover">
  <img src="/${imageUrl}" alt="${title}" onerror="this.onerror=null;this.src='/omni.png';">
  </div>
  <div class="collection-recipe-title">
  ${title}
  </div>
  <div class="collection-recipe-description">
  ${description}
  </div>
  <div class="collection-recipe-action">
  <button class="btn btn-primary" @click="await clickToAction(item, 'recipe');"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none">
  <path d="M12.5 7.75V11.5C12.5 12.3284 11.8284 13 11 13H2C1.17157 13 0.5 12.3284 0.5 11.5V7.75M9.5 4L6.5 1M6.5 1L3.5 4M6.5 1V10" stroke="white" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
  </svg><span>Load Recipe</span></button>
  <button x-show="${canDelete}" class="btn" @click="window.parent.clickDeleteRecipe(item);"><span>Delete Recipe</span></button>
<button class="btn btn-secondary" @click="await focusItem(item)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 3.67333V3.66667M7 10.3333V5.66667M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7Z" stroke="#505050" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><span>Learn More</span></button>
  </div>
  </div>`;
  }
}

export default RecipeRenderer;
