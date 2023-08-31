import { omnilog } from 'mercs_shared'
import CollectionRenderer from './CollectionRenderer'

class BlockRenderer extends CollectionRenderer {

  render (content: any): string {

    if (!content)
    {
      return "INVALID BLOCK"
    }

    const styledCategories = [
      'namespace',
      'default',
      'computer-vision',
      'image-generation',
      'image-manipulation',
      'communication',
      'input',
      'output',
      'audio-generation',
      'audio-processing',
      'document-processing',
      'data-transformation',
      'education',
      'utilities',
      'translation',
      'text-generation',
      'text-manipulation',
      'security']
    const category = content.category;
    let categoryStyle = category?.toLowerCase().replace(/ /g,'-') || '';
    categoryStyle = styledCategories.includes(categoryStyle) ? categoryStyle : 'default';
    const title = content.title;
    const namespace = content.name;
    let oid = namespace.split('.')
    const ns = oid.shift()
    const op = oid.join('.')
    const names = [ns, op]
    const description = content.description;
    return `<div class='collection-block'>
    <div class='collection-block-header'>
<div class='collection-fav'>
<svg xmlns='http://www.w3.org/2000/svg' width='17' height='15' viewBox='0 0 17 15' fill='none'>
<path d='M2.1095 7.70617L8.5 14.3333L14.8905 7.70617C15.6009 6.96942 16 5.97024 16 4.92838C16 2.75879 14.304 1 12.2119 1C11.2073 1 10.2437 1.41388 9.53333 2.15059L8.5 3.22222L7.46667 2.15059C6.75624 1.41388 5.79273 1 4.78807 1C2.69597 1 1 2.75879 1 4.92838C1 5.97024 1.3991 6.96942 2.1095 7.70617Z' stroke='#505050' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
</svg>
</div>
    </div>
  <div class='collection-block-title'>
  ${title}
  </div>
  <div class='collection-block-tags' x-data='{names: ${JSON.stringify(names)}}'>
  <template x-for='(name, index) in names' :key='index'>
  <div class='tag namespace' x-text='name' @click.stop.prevent='search = name; $refs.search.focus();'>
  </div>
  </template>
  <div class='tag ${categoryStyle}'
  @click.stop.prevent='search = "${category}"; $refs.search.focus();'>
  ${category}
  </div>
  </div>
  <div class='collection-block-description'>
  ${description}
  </div>
  <div class='collection-action'>
    <button class='btn btn-primary' @click='await clickToAction(item, "block");'><svg width='13' height='14' viewBox='0 0 13 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M10.2689 5.95853L10.2689 3.0614C10.2689 2.05545 9.45863 1.23997 8.45908 1.23997L3.02961 1.23996C2.03006 1.23996 1.21977 2.05544 1.21977 3.06138L1.21973 8.37566C1.21972 9.38161 2.03002 10.1971 3.02956 10.1971H6.05121M8.27809 10.1971H10.2689M10.2689 10.1971H12.2597M10.2689 10.1971V8.19352M10.2689 10.1971V12.5649' stroke='white' stroke-width='0.96' stroke-linecap='round'/>
    </svg> <span>Add Block</span></button>
    <button class='btn btn-secondary' @click='await focusItem(item)'><svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'>
    <path d='M7 3.67333V3.66667M7 10.3333V5.66667M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7Z' stroke='#505050' stroke-width='0.96' stroke-linecap='round' stroke-linejoin='round'/>
    </svg><span>Block info</span></button>
  </div>
  </div>`
  }
}

export default BlockRenderer
