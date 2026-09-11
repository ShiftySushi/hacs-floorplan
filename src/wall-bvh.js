// Pre-order bounds tree with escape links: rays skip entire groups of walls.
// Leaves still use the original oriented-wall intersection for exact blocking.
export function wallBVH(walls) {
  const nodes=[];
  function visit(items){
    const index=nodes.length,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const item of items)for(let a=0;a<3;a++){min[a]=Math.min(min[a],item.min[a]);max[a]=Math.max(max[a],item.max[a]);}
    const node={min,max,wall:items.length===1?items[0].index:-1,escape:0};nodes.push(node);
    if(items.length>1){const axis=[0,1,2].sort((a,b)=>(max[b]-min[b])-(max[a]-min[a]))[0];items.sort((a,b)=>(a.min[axis]+a.max[axis])-(b.min[axis]+b.max[axis]));const mid=items.length>>1;visit(items.slice(0,mid));visit(items.slice(mid));}
    node.escape=nodes.length;return index;
  }
  if(walls.length)visit([...walls]);
  return nodes;
}
