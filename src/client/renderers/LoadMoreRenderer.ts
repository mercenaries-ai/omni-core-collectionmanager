import CollectionRenderer from "./CollectionRenderer";

class LoadMoreRenderer extends CollectionRenderer {
  render(content: any): string {
    const opts = {cursor: content?.cursor};
    console.log(opts)
    return `<div class="collection cursor-pointer" @click='fetchItems(${JSON.stringify({opts: opts})})'>
    <div class="loadmore">
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
<path d="M40 6.40002V76.8M8 40H72" stroke="#DEDEDF" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
Load More
    </div>
    </div>`;
  }
}

export default LoadMoreRenderer;
