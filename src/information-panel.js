import {element,button,field} from './dom.js';
import {entitySelect,memberPicker} from './setup.js';
import {informationRows,informationTypes,informationIcons} from './information.js';
import {icon} from './icons.js';
import {energyFields} from './live-fields.js';
import {informationLayoutFields,informationItemFields} from './information-layout.js';
import {informationChart} from './information-chart.js';

export const informationStyles=`
.information-chart-axis{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--fp-text,var(--primary-text-color,#26343d));opacity:.8}.information-chart meter::-webkit-meter-optimum-value{background:var(--information-colour,var(--fp-accent,#007c91))}.information-chart meter::-moz-meter-bar{background:var(--information-colour,var(--fp-accent,#007c91))}
.information-panel .information-label{color:inherit;opacity:.78}.information-panel .information-item{gap:2px;padding:6px 0}.information-panel .information-item>button{min-height:0;padding:0}.information-panel .information-event{margin-top:5px;padding:6px 0;line-height:1.45}.information-event+.information-event{border-top:1px solid #80958c25}.information-event .information-date{display:block;font-size:10px;font-weight:500;opacity:.8}.information-panel .information-energy-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:11px;padding:3px 0}.information-energy-row span:last-child{text-align:right;font-variant-numeric:tabular-nums}.information-energy-row span{overflow-wrap:anywhere}
.information-panel{position:absolute;top:var(--fp-info-top,64px);left:14px;width:min(280px,calc(100% - 28px));max-height:calc(100% - var(--fp-info-top,64px) - 80px);overflow:auto;z-index:4;padding:5px 12px;border:1px solid color-mix(in srgb,var(--fp-line,#cad5d0) 60%,transparent);border-radius:14px;background:color-mix(in srgb,var(--fp-surface,#fff) 78%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 20px #172e3610;color:var(--fp-text,var(--primary-text-color,#26343d));font-size:12px;overscroll-behavior:contain}
.information-panel[data-position=top-right]{left:auto;right:14px}.information-panel summary{cursor:pointer;min-height:34px;display:flex;align-items:center;font-weight:600}.information-panel summary::after{content:'⌄';margin-left:auto}.information-panel[open] summary::after{transform:rotate(180deg)}.information-panel summary:focus-visible{outline:2px solid var(--fp-accent,#007c91);border-radius:4px}.information-item{padding:8px 0;display:grid;gap:3px;border-top:1px solid #80958c25;min-width:0}.information-item button{display:block;text-align:left;border:0;box-shadow:none;background:transparent;color:inherit;padding:3px 0;min-height:36px;width:100%;white-space:normal}.information-label{display:block;font-size:10px;color:var(--secondary-text-color,#63776e);font-weight:500}.information-value{display:block;font-size:13px;font-weight:600;overflow-wrap:anywhere;line-height:1.4}.information-detail{font-size:11px;opacity:.8;overflow-wrap:anywhere}.information-item[data-unavailable=true] .information-value{font-weight:400;opacity:.7}
.information-panel{width:min(340px,calc(100% - 28px))}.information-grid{display:grid;grid-template-columns:repeat(var(--information-columns,2),minmax(0,1fr));column-gap:12px}.information-item{align-content:start;border-top-color:var(--information-colour,#80958c25)}.information-item[data-full-width=true]{grid-column:1/-1}.information-label{display:flex;align-items:center;gap:5px}.information-label .icon{width:16px;height:16px;flex:none;color:var(--information-colour,inherit)}
@container(max-width:600px){.information-panel{left:8px;width:min(300px,calc(100% - 16px));max-height:min(38%,calc(100% - var(--fp-info-top,150px) - 80px));padding:3px 10px}.information-panel[data-position=top-right]{right:8px}.information-item{padding:6px 0}}
.information-panel{width:min(var(--information-width,340px),calc(100% - 28px));max-height:min(var(--information-height,100%),calc(100% - var(--fp-info-top,64px) - 80px))}.information-panel[data-density=comfortable] .information-item{padding:12px 0;gap:6px}.information-panel[data-position=bottom-left],.information-panel[data-position=bottom-right]{top:auto;bottom:78px}.information-panel[data-position=bottom-right]{left:auto;right:14px}.information-item[data-size=small] .information-value{font-size:11px}.information-item[data-size=large] .information-value{font-size:20px}.information-item[data-align=center],.information-item[data-align=center] button{text-align:center}.information-item[data-align=right],.information-item[data-align=right] button{text-align:right}.information-item[data-align=center] .information-label{justify-content:center}.information-item[data-align=right] .information-label{justify-content:flex-end}.information-heading .information-label{font-size:13px;font-weight:650;opacity:1}.information-heading .information-value{display:none}.information-chart{min-width:0;color:var(--information-colour,var(--fp-text,var(--primary-text-color,#26343d)))}.information-chart svg{display:block;width:100%;height:var(--information-graph-height,100px)}.information-chart .information-detail{display:block;color:var(--fp-text,var(--primary-text-color,#26343d));font-size:10px}.information-chart meter{display:block;width:100%;height:22px;accent-color:var(--information-colour,var(--fp-accent,#007c91))}
@container(max-width:600px){.information-panel{width:min(var(--information-width,300px),calc(100% - 16px));max-height:min(var(--information-height,38%),calc(100% - var(--fp-info-top,150px) - 80px))}.information-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.information-panel[data-position=bottom-right]{right:8px}.information-panel[data-columns="1"] .information-grid{grid-template-columns:minmax(0,1fr)}.information-item[data-span="3"],.information-item[data-span="4"]{grid-column:1/-1!important}}
`;
export function informationPanel(host,states){
  const config=host.config.information,rows=informationRows(config,states,new Date(),host._hass?.locale?.language || 'en-GB',host.calendarCache);
  if(!rows.length)return null;
  // Read the live disclosure state: the native toggle event is asynchronous.
  const open=host.planSlot?.querySelector('.information-panel')?.open??host.informationOpen!==false;
  const panel=element('details',{className:'information-panel',open,'data-position':config.position || 'top-left','data-density':config.density||'compact'},[element('summary',{text:config.title||'At a glance'})]);
  panel.dataset.columns=String(config.columns||2);
  if(config.width)panel.style.setProperty('--information-width',`${config.width}px`);
  if(config.max_height)panel.style.setProperty('--information-height',`${config.max_height}%`);
  panel.addEventListener('toggle',()=>{if(panel.isConnected)host.informationOpen=panel.open;});
  const grid=element('div',{className:'information-grid'});grid.style.setProperty('--information-columns',config.columns || 2);panel.append(grid);
  for(const row of rows){
    const content=[element('span',{className:'information-label',text:row.label}),element('span',{className:'information-value',text:row.value})];
    const node=element('div',{className:'information-item','data-unavailable':String(row.unavailable)});
    node.dataset.fullWidth=String(row.fullWidth);node.dataset.entity=row.entity || '';
    const item=row.item;node.dataset.size=item.text_size||'medium';node.dataset.align=item.align||'left';
    if(item.column_span){node.dataset.span=String(Math.min(item.column_span,config.columns||2));node.style.gridColumn=`span ${node.dataset.span}`;}
    if(item.min_height)node.style.minHeight=`${item.min_height}px`;
    if(item.type==='heading')node.classList.add('information-heading');
    if(row.colour)node.style.setProperty('--information-colour',row.colour);
    if(row.icon&&row.icon!=='none')content[0].prepend(icon(row.icon));
    if(row.entity){const action=button('',()=>host.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:row.entity},bubbles:true,composed:true})),{'aria-label':`${row.label}: ${row.value}`});action.append(...content);node.append(action);}else node.append(...content);
    if(item.type==='entity'&&['line','bar','gauge'].includes(item.display))node.append(informationChart(item,states[item.entity],host.informationHistory,host._hass?.locale?.language||'en-GB'));
    for(const event of row.showDetails?row.events||[]:[]){const action=button('',()=>host.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:event.entity},bubbles:true,composed:true})),{className:'information-event','data-entity':event.entity,'aria-label':`${event.title} · ${event.detail}`});action.append(element('span',{className:'information-date',text:[event.date,event.time].join(' · ')}),element('span',{className:'information-value',text:event.title}));if(event.source)action.append(element('span',{className:'information-detail',text:event.source}));node.append(action);}
    for(const device of row.showDetails?row.energyRows||[]:[]){node.append(element('div',{className:'information-energy-row'},[element('span',{text:device.label}),element('span',{text:device.power==='Unavailable'&&device.energy==='Unavailable'?'Unavailable':[device.power==='Unavailable'?'—':device.power,device.energy==='Unavailable'?'—':device.energy].join(' · ')})]));}
    if(row.detail&&row.showDetails)node.append(element('span',{className:'information-detail',text:row.detail}));grid.append(node);
  }
  return panel;
}
export function informationSetup(host){
  const config=host.config.information || {enabled:false,items:[]};
  const save=()=>{host.config.information=config;host.emit();};
  const root=element('fieldset',{},[element('legend',{text:'At a glance'}),field('Show information panel',element('input',{type:'checkbox',checked:config.enabled!==false,onchange:e=>{config.enabled=e.target.checked;save();}})),element('p',{className:'muted',text:'Add any entity, numeric charts, calendars or section headings. Set item order, widths and sizes below. Column spans override Full width; narrow screens use at most two columns. The panel stays visible when markers are hidden.'})]);
  root.append(...informationLayoutFields(config,save));
  root.append(field('Panel position',element('select',{onchange:e=>{config.position=e.target.value;save();}},['top-left','top-right','bottom-left','bottom-right'].map(value=>element('option',{value,text:value.replace('-',' ').replace(/^./,c=>c.toUpperCase()),selected:(config.position || 'top-left')===value})))));
  root.append(field('Columns',element('select',{onchange:e=>{config.columns=Number(e.target.value);save();}},[1,2,3,4].map(value=>element('option',{value,text:String(value),selected:(config.columns||2)===value})))));
  config.items.forEach((item,i)=>{
    const group=element('fieldset',{},[element('legend',{text:`Item ${i+1}`}),field('Label',element('input',{value:item.label || '',maxLength:80,onchange:e=>{item.label=e.target.value;save();}}))]);
    if(['entity','weather'].includes(item.type))group.append(field('Information entity',entitySelect(host,item.type==='entity'?/^[a-z_]+\./:new RegExp(`^${item.type}\\.`),item.entity || '',value=>{item.entity=value;save();})));
    group.append(...informationItemFields(item,save));
    group.append(field('Icon',element('select',{onchange:e=>{item.icon=e.target.value;save();}},Object.entries(informationIcons).map(([value,text])=>element('option',{value,text,selected:(item.icon||'none')===value})))),field('Accent colour',element('input',{type:'color',value:item.colour||'#007c91',onchange:e=>{item.colour=e.target.value;save();}})),button('Reset colour',()=>{delete item.colour;save();}));
    for(const [key,label,fallback] of [['show_details','Show details',true],['show_unavailable','Show unavailable summary counts',!!item.entities?.length],['full_width','Full width',['calendar','energy','heading'].includes(item.type)]])group.append(field(label,element('input',{type:'checkbox',checked:item[key]??fallback,onchange:e=>{item[key]=e.target.checked;save();}})));
    if(item.type==='energy')group.append(energyFields(host,item));
    else if(item.type==='calendar')group.append(memberPicker(host,'Calendars',item.entities||[item.entity].filter(Boolean),/^calendar\./,ids=>{item.entities=ids;delete item.entity;save();}));
    else if(!['heading','entity','weather'].includes(item.type)){
      group.append(element('p',{className:'muted',text:'Uses all matching entities unless you select a list below.'}));
      const select=element('select',{multiple:true,size:4,'aria-label':'Summary entities',onchange:e=>{item.entities=[...e.target.selectedOptions].map(o=>o.value);save();}});
      const states=host._hass?.states || {},ids=new Set([...(item.entities || []),...Object.keys(states).filter(id=>item.type==='people'?id.startsWith('person.'):item.type==='updates'?id.startsWith('update.'):states[id]?.attributes?.device_class==='battery')]);
      [...ids].sort().forEach(id=>select.append(element('option',{value:id,text:states[id]?.attributes?.friendly_name || id,selected:item.entities?.includes(id)})));group.append(select);
    }
    if(item.type==='low_battery')group.append(field('Low battery threshold (%)',element('input',{type:'number',min:0,max:100,value:item.threshold??20,onchange:e=>{item.threshold=Number(e.target.value);save();}})));
    if(item.type==='low_battery')for(const [key,label] of [['count_entity','Battery count sensor'],['names_entity','Battery names sensor']])group.append(field(label,entitySelect(host,/^sensor\./,item[key]||'',id=>{item[key]=id;save();})));
    group.append(button('Move up',()=>{[config.items[i-1],config.items[i]]=[item,config.items[i-1]];save();},{disabled:i===0}),button('Move down',()=>{[config.items[i+1],config.items[i]]=[item,config.items[i+1]];save();},{disabled:i===config.items.length-1}),button('Duplicate item',()=>{config.items.splice(i+1,0,structuredClone(item));save();},{disabled:config.items.length>=48}),button('Remove item',()=>{config.items.splice(i,1);save();}));root.append(group);
  });
  const type=element('select',{'aria-label':'Information type'},Object.entries(informationTypes).map(([value,text])=>element('option',{value,text})));
  root.append(type,button('Add information',()=>{
    const item={type:type.value};
    if(['entity','weather','calendar'].includes(item.type)){
      item.entity=Object.keys(host._hass?.states || {}).find(id=>item.type==='entity'?/^[a-z_]+\.[a-z0-9_]+$/.test(id):id.startsWith(item.type+'.'));
      if(!item.entity){host.error='No matching entity is available. Connect Home Assistant before adding this item.';host.render();return;}
    }
    config.enabled=true;config.items.push(item);save();
  },{disabled:config.items.length>=48}));return root;
}
