import {element,button,field} from './dom.js';
import {entitySelect} from './setup.js';
import {informationRows,informationTypes} from './information.js';

export const informationStyles=`
.information-panel{position:absolute;top:var(--fp-info-top,64px);left:14px;width:min(280px,calc(100% - 28px));max-height:calc(100% - var(--fp-info-top,64px) - 80px);overflow:auto;z-index:4;padding:5px 12px;border:1px solid color-mix(in srgb,var(--fp-line,#cad5d0) 60%,transparent);border-radius:14px;background:color-mix(in srgb,var(--fp-surface,#fff) 78%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 20px #172e3610;color:var(--fp-text,var(--primary-text-color,#26343d));font-size:12px;overscroll-behavior:contain}
.information-panel[data-position=top-right]{left:auto;right:14px}.information-panel summary{cursor:pointer;min-height:34px;display:flex;align-items:center;font-weight:600}.information-panel summary::after{content:'⌄';margin-left:auto}.information-panel[open] summary::after{transform:rotate(180deg)}.information-panel summary:focus-visible{outline:2px solid var(--fp-accent,#007c91);border-radius:4px}.information-item{padding:8px 0;display:grid;gap:3px;border-top:1px solid #80958c25;min-width:0}.information-item button{display:block;text-align:left;border:0;box-shadow:none;background:transparent;color:inherit;padding:3px 0;min-height:36px;width:100%;white-space:normal}.information-label{display:block;font-size:10px;color:var(--secondary-text-color,#63776e);font-weight:500}.information-value{display:block;font-size:13px;font-weight:600;overflow-wrap:anywhere;line-height:1.4}.information-detail{font-size:11px;opacity:.8;overflow-wrap:anywhere}.information-item[data-unavailable=true] .information-value{font-weight:400;opacity:.7}
@container(max-width:600px){.information-panel{left:8px;width:min(220px,calc(100% - 16px));max-height:min(38%,calc(100% - var(--fp-info-top,150px) - 80px));padding:3px 10px}.information-panel[data-position=top-right]{right:8px}.information-item{padding:6px 0}}
`;
export function informationPanel(host,states){
  const config=host.config.information,rows=informationRows(config,states,new Date(),host._hass?.locale?.language || 'en-GB');
  if(!rows.length)return null;
  const panel=element('details',{className:'information-panel',open:host.informationOpen!==false,'data-position':config.position || 'top-left'},[element('summary',{text:'At a glance'})]);
  panel.addEventListener('toggle',()=>{if(panel.isConnected)host.informationOpen=panel.open;});
  for(const row of rows){
    const content=[element('span',{className:'information-label',text:row.label}),element('span',{className:'information-value',text:row.value})];
    const node=element('div',{className:'information-item','data-unavailable':String(row.unavailable)});
    if(row.entity){const action=button('',()=>host.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:row.entity},bubbles:true,composed:true})),{'aria-label':`${row.label}: ${row.value}`});action.append(...content);node.append(action);}else node.append(...content);
    if(row.detail)node.append(element('span',{className:'information-detail',text:row.detail}));panel.append(node);
  }
  return panel;
}
export function informationSetup(host){
  const config=host.config.information || {enabled:false,items:[]};
  const save=()=>{host.config.information=config;host.emit();};
  const root=element('fieldset',{},[element('legend',{text:'At a glance'}),field('Show information panel',element('input',{type:'checkbox',checked:config.enabled!==false,onchange:e=>{config.enabled=e.target.checked;save();}})),element('p',{className:'muted',text:'Add weather, the next event from each calendar, household summaries or any sensor (energy, pollen, car charge). The panel stays visible when markers are hidden.'})]);
  root.append(field('Panel position',element('select',{onchange:e=>{config.position=e.target.value;save();}},['top-left','top-right'].map(value=>element('option',{value,text:value==='top-left'?'Top left':'Top right',selected:(config.position || 'top-left')===value})))));
  config.items.forEach((item,i)=>{
    const group=element('fieldset',{},[element('legend',{text:`Item ${i+1}`}),field('Label',element('input',{value:item.label || '',maxLength:80,onchange:e=>{item.label=e.target.value;save();}}))]);
    if(['entity','weather','calendar'].includes(item.type))group.append(field('Information entity',entitySelect(host,item.type==='entity'?/^[a-z_]+\./:new RegExp(`^${item.type}\\.`),item.entity || '',value=>{item.entity=value;save();})));
    else {
      group.append(element('p',{className:'muted',text:'Uses all matching entities unless you select a list below.'}));
      const select=element('select',{multiple:true,size:4,'aria-label':'Summary entities',onchange:e=>{item.entities=[...e.target.selectedOptions].map(o=>o.value);save();}});
      const states=host._hass?.states || {},ids=new Set([...(item.entities || []),...Object.keys(states).filter(id=>item.type==='people'?id.startsWith('person.'):item.type==='updates'?id.startsWith('update.'):states[id]?.attributes?.device_class==='battery')]);
      [...ids].sort().forEach(id=>select.append(element('option',{value:id,text:states[id]?.attributes?.friendly_name || id,selected:item.entities?.includes(id)})));group.append(select);
    }
    if(item.type==='low_battery')group.append(field('Low battery threshold (%)',element('input',{type:'number',min:0,max:100,value:item.threshold??20,onchange:e=>{item.threshold=Number(e.target.value);save();}})));
    group.append(button('Move up',()=>{[config.items[i-1],config.items[i]]=[item,config.items[i-1]];save();},{disabled:i===0}),button('Remove item',()=>{config.items.splice(i,1);save();}));root.append(group);
  });
  const type=element('select',{'aria-label':'Information type'},Object.entries(informationTypes).map(([value,text])=>element('option',{value,text})));
  root.append(type,button('Add information',()=>{
    const item={type:type.value};
    if(['entity','weather','calendar'].includes(item.type)){
      item.entity=Object.keys(host._hass?.states || {}).find(id=>item.type==='entity'?id.startsWith('sensor.'):id.startsWith(item.type+'.'));
      if(!item.entity){host.error='No matching entity is available. Connect Home Assistant before adding this item.';host.render();return;}
    }
    config.enabled=true;config.items.push(item);save();
  },{disabled:config.items.length>=16}));return root;
}
