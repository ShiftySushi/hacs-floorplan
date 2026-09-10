export function blendAppearance(from,to,progress) {
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  const start=from.level?from.colour:to.colour,end=to.level?to.colour:from.colour;
  return {level:from.level+(to.level-from.level)*ease,colour:start.map((c,i)=>Math.round(c+(end[i]-c)*ease))};
}

export function panelFrame(effect,index,count,time,appearance) {
  if(effect==='breathe')return {...appearance,level:appearance.level*(.62+.38*(.5+.5*Math.sin(time*.0015)))};
  if(effect==='wave')return {...appearance,level:appearance.level*(.2+.8*(.5+.5*Math.sin(time*.002-index/Math.max(1,count)*Math.PI*2)))};
  if(effect==='rainbow')return {level:appearance.level,colour:[0,2,4].map(phase=>Math.round(127.5+127.5*Math.sin(time*.0005+index*.3+phase*Math.PI/3)))};
  return appearance;
}
