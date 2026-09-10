import { svgElement, button } from './dom.js';
const paths = {
  sliders:'M4 6h4m4 0h8M4 12h10m4 0h2M4 18h2m4 0h10M8 3v6m6 0v6M6 15v6',
  logo:'M3 3h18v18H3zM3 12h7m4 0h7M12 3v5m0 8v5M7 7h1m9 10h1',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  pendant:'M12 2v7M7 9h10l4 8H3zM9 20h6', spot:'M3 5h18M7 8h10l-1 4H8zM8 15l-3 5m7-5v6m4-6 3 5',
  floor:'M3 10 12 3l9 7v11H3z M9 21v-7h6v7', bulb:'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 3H9z',
  presence:'M16 21v-3a4 4 0 0 0-8 0v3M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  temperature:'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0M12 8v10', power:'M12 2v10M6 5a9 9 0 1 0 12 0',
  brightness:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  colour:'M12 3C8 9 5 11 5 15a7 7 0 0 0 14 0c0-4-3-6-7-12z', rotate:'M20 8a9 9 0 1 0 1 8M20 2v6h-6',
  plus:'M12 5v14M5 12h14', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  edit:'m4 16 12-12 4 4L8 20H4zM14 6l4 4',sofa:'M4 11V6h16v5M4 19v2m16-2v2M2 10h4v5h12v-5h4v9H2z',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',cube:'m12 2 10 5v10l-10 5-10-5V7zM2 7l10 5 10-5M12 12v10',
  undo:'M9 4 3 10l6 6M3 10h11a6 6 0 0 1 6 6v4',redo:'m15 4 6 6-6 6M21 10H10a6 6 0 0 0-6 6v4',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  check:'m4 12 5 5L20 6', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  group:'M3 3h7v7H3zM14 3h7v7h-7zM8 15h8v7H8zM6 10v3h12v-3M12 13v2',settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6'
};
export function icon(name) {
  const svg=svgElement('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',class:'icon'});
  svg.append(svgElement('path',{d:paths[name] || paths.floor})); return svg;
}
export function iconButton(label,name,handler,props={}) {
  const node=button(label,handler,props); node.prepend(icon(name)); return node;
}
