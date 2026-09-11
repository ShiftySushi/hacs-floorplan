import { available, capabilities, normaliseConfig, serviceCalls } from './lights.js';
import {isolateRoomFloor} from './room-isolation.js';
import {labelMarkers} from './entity-labels.js';
import {weatherEntity} from './weather.js';
import { displaySettings, displayFields } from './display-settings.js';
import { styles } from './styles.js';
import { element, button, field, preserveFocus } from './dom.js';
import { renderPlan } from './plan.js';
import { roomState,roomPresence } from './rooms.js';
import { icon, iconButton } from './icons.js';
import { render3D } from './plan3d.js';
import { roomTemperature, roomReadoutPoint, heatingState, temperatureTone } from './heating.js';
import { daylightLevel, stageColour } from './daylight.js';
const collectionStyles='.collection-controls{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:4px;align-items:center;width:100%;padding:3px 0}.collection-controls .collection-adjust{display:inline-flex;align-items:center;justify-content:center;gap:4px;align-self:center;width:70px;min-width:0;min-height:44px;padding:3px;font-size:11px;line-height:1.2;border-color:transparent;background:transparent;color:var(--secondary-text-color,#63776e);box-shadow:none}.collection-controls .collection-adjust .icon{width:15px;height:15px}.collection-controls .collection-adjust:hover,.collection-controls .collection-adjust[aria-pressed=true]{background:var(--secondary-background-color,#eef4f0);color:var(--primary-text-color,#26343d)}.collection-controls .collection-adjust:focus-visible{outline:2px solid var(--primary-color,#007c91);outline-offset:1px}';
import {sceneEntities,sceneState} from './ha-updates.js';
import {informationPanel,informationStyles} from './information-panel.js';
import {lightToggleIds} from './light-targets.js';

export class FloorplanCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    for(const event of ['pointermove','pointerdown','keydown'])this.shadowRoot.addEventListener(event,()=>this.plan?.pauseIdle?.()); this.selected = new Set(); this.busy = false;
    this.shadowRoot.addEventListener('focusout', e => {
      if (['INPUT','SELECT'].includes(e.target.tagName) && this.deferredUpdate) requestAnimationFrame(() => { this.deferredUpdate = false; this.render(); });
    });
  }
  static getConfigElement() { return document.createElement('floorplan-card-editor'); }
  connectedCallback() { if (this.config) this.render();clearInterval(this.daylightTimer);this.daylightTimer=setInterval(()=>{if(!document.hidden&&this.config)this.render();},60000); }
  disconnectedCallback() { clearInterval(this.daylightTimer);this.entranceObserver?.disconnect();this.plan?.dispose?.(); this.plan=null; this.planKey=null; this.stageObserver?.disconnect(); this.planObserver?.disconnect(); }
  fitPlan() {
    const tools=this.planSlot?.querySelector('.stage-tools');if(tools)this.planSlot.style.setProperty('--fp-info-top',`${tools.offsetTop+tools.offsetHeight+12}px`);
    if(!this.plan || !this.planSlot?.clientWidth)return;
    const ratioText=this.plan.style.aspectRatio || '1.15',parts=ratioText.split('/').map(Number),ratio=parts.length===2?parts[0]/parts[1]:parts[0];
    if(!Number.isFinite(ratio) || ratio<=0)return;
    const bounds=getComputedStyle(this.planSlot), availableWidth=this.planSlot.clientWidth-parseFloat(bounds.paddingLeft)-parseFloat(bounds.paddingRight),availableHeight=this.planSlot.clientHeight-parseFloat(bounds.paddingTop)-parseFloat(bounds.paddingBottom);
    const three=this.plan.classList.contains('plan-3d');
    this.planSlot.classList.toggle('has-3d-canvas',three);
    const width=Math.max(1,three?this.planSlot.clientWidth:Math.min(availableWidth,availableHeight*ratio)),height=three?this.planSlot.clientHeight:width/ratio;
    for(const [key,value] of [['width',`${width}px`],['height',`${height}px`],['minHeight','0px']])if(this.plan.style[key]!==value)this.plan.style[key]=value;
  }
  static getStubConfig() { return { type: 'custom:floorplan-card', title: 'Floorplan', floors: [], groups: [] }; }
  setConfig(config) {
    if (config.appearance?.mode !== this.config?.appearance?.mode) this.viewMode=null;
    this.config = normaliseConfig(config);
    this.watchedEntities=sceneEntities(this.config);
    this.hassSceneState=undefined;
    const identity=JSON.stringify([location.pathname,this.config.title,this.config.floors.map(f=>f.id)]);
    let hash=2166136261;for(const char of identity)hash=Math.imul(hash^char.charCodeAt(0),16777619);
    const key=`floorplan-view-${hash>>>0}`;
    if(this.viewStorageKey!==key){this.viewStorageKey=key;this.viewStates={};this.blindStates={};this.inspectorOpen=false;try{const saved=JSON.parse(localStorage.getItem(key));if(saved){if(['clean','3d','pokemon','zelda','sims'].includes(saved.mode))this.viewMode=saved.mode;this.floorId=saved.floorId;this.building=!!saved.building;this.exterior=!!saved.exterior;this.hideOverlays=!!saved.hideOverlays;this.inspectorOpen=!!saved.inspectorOpen;this.displayPreferences=saved.display;this.isolatedRooms=saved.isolatedRooms || {};this.viewStates=saved.cameras || {};this.blindStates=saved.blinds || {};}}catch{}}
    if (!this.config.floors.some(f => f.id === this.floorId)) this.floorId = this.config.floors[0]?.id;
    const configured = new Set([...this.config.floors.flatMap(f => [...f.entities.map(e => e.entity), ...f.rooms.flatMap(r => r.lights), ...(f.objects || []).map(o=>o.light_entity).filter(Boolean)]), ...this.config.groups.flatMap(g => g.entities)]);
    this.selected = new Set([...this.selected].filter(id => configured.has(id))); this.render();
  }
  set hass(hass) { const next=sceneState(hass,this.watchedEntities);this._hass = hass;if(next===this.hassSceneState)return;this.hassSceneState=next; if (!['INPUT', 'SELECT'].includes(this.shadowRoot.activeElement?.tagName)) this.render(); else this.deferredUpdate = true; }
  saveView(){try{localStorage.setItem(this.viewStorageKey,JSON.stringify({mode:this.viewMode || this.config.appearance.mode,floorId:this.floorId,building:!!this.building,exterior:!!this.exterior,hideOverlays:!!this.hideOverlays,inspectorOpen:!!this.inspectorOpen,display:this.displayPreferences,isolatedRooms:this.isolatedRooms,cameras:this.viewStates,blinds:this.blindStates}));}catch{}}
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }
  toggle(ids) {
    this.selectionMode=true;this.inspectorOpen=true;
    const remove = ids.every(id => this.selected.has(id));
    ids.forEach(id => remove ? this.selected.delete(id) : this.selected.add(id)); this.render();
  }
  async control(action, value, ids=[...this.selected]) {
    if (this.busy) return;
    this.busy = true; this.error = ''; this.render();
    try {
      const unbound=new Set(this.config.floors.flatMap(f=>f.entities).filter(e=>e.unbound).map(e=>e.entity));
      const calls = serviceCalls(this._hass?.states || {}, ids.filter(id=>!unbound.has(id)), action, value);
      const results = await Promise.allSettled(calls.map(call => this._hass.callService('light', call.service, call.data)));
      if (results.some(result => result.status === 'rejected')) this.error = 'Some lights could not be updated. Check their state and try again.';
    } catch { this.error = 'The light command could not be sent. Please try again.'; }
    finally { this.busy = false; this.render(); }
  }
  activateLight(floorId,id){
    const marker=this.config.floors.find(f=>f.id===floorId)?.entities.find(e=>e.entity===id),states=this._hass?.states || {};
    if(marker?.unbound||!available(states[id]))return;
    const unbound=new Set(this.config.floors.flatMap(f=>f.entities).filter(e=>e.unbound).map(e=>e.entity));
    const ids=lightToggleIds(this.config,floorId,id).filter(entity=>!unbound.has(entity)&&available(states[entity]));
    if(this.selectionMode)this.toggle(ids);
    else this.control(ids.some(entity=>states[entity]?.state==='on')?'off':'on',undefined,ids);
  }
  render() {
    if (!this.config) return;
    const restoreFocus=preserveFocus(this.shadowRoot);
    const states = {...this._hass?.states};
    for(const item of this.config.floors.flatMap(f=>f.entities))if(item.unbound)delete states[item.entity];
    if (!this.card) {
      this.card=element('ha-card',{className:'floorplan-dashboard'});
      this.headerSlot=element('div');this.planSlot=element('div',{className:'plan-slot'});this.controlsSlot=element('div',{className:'inspector-slot'});
      this.card.append(this.headerSlot,element('div',{className:'card-workspace'},[this.planSlot,this.controlsSlot]));
      this.shadowRoot.replaceChildren(element('style',{text:styles+collectionStyles+informationStyles}),this.card);
      this.entranceObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){this.card.classList.add('has-entered');this.entranceObserver.disconnect();}});this.entranceObserver.observe(this.card);
    }
    const display=displaySettings({...this.config.appearance?.display,...this.displayPreferences});
    this.card.style.setProperty('--fp-marker-scale',display.size);
    for(const key of ['lights','temperatures','heating','controls'])this.card.dataset[key]=display[key];
    this.stageObserver ||= new ResizeObserver(()=>this.fitPlan());this.stageObserver.observe(this.planSlot);
    this.planSlot.classList.toggle('has-outdoor',!!roomTemperature({temperature_entity:this.config.outdoor_temperature_entity},states));
    const header = element('div', {className:'card-header stage-style'});
    const tabs = element('div', { className: 'row floor-tabs', role: 'group', 'aria-label': 'Floors' });
    this.config.floors.forEach(floor => tabs.append(iconButton(floor.name || floor.id,'floor', () => { this.floorId = floor.id; this.exterior=false; this.render(); }, { 'aria-pressed': String(floor.id === this.floorId) })));
    const mode=this.viewMode || this.config.appearance?.mode || 'clean';
    const exterior=['3d','sims'].includes(mode)&&this.exterior?this.config.exterior:undefined;
    const weather={...this.config.weather,entity:weatherEntity(this.config)};
    const daylight=daylightLevel(states,new Date(),this._hass?.config,weather.entity);this.planSlot.style.setProperty('--fp-stage-background',stageColour(mode,daylight));
    const modes=element('div',{className:'row view-modes',role:'group','aria-label':'Render style'});
    for(const [id,label,glyph] of [['clean','2D','grid'],['3d','3D','cube']]) modes.append(iconButton(label,glyph,()=>{this.viewMode=id;this.render();},{'aria-pressed':String(mode===id)}));
    const customStyle=element('select',{'aria-label':'Custom style',onchange:e=>{this.viewMode=e.target.value;this.render();}},[element('option',{value:'',text:'Custom',disabled:true,selected:!['pokemon','zelda','sims'].includes(mode)})]);
    for(const [value,text] of [['pokemon','Pokémon'],['zelda','Zelda'],['sims','Sims-like']])customStyle.append(element('option',{value,text,selected:mode===value}));modes.append(customStyle);
    if(['3d','sims'].includes(mode)&&!exterior){
      const activeFloor=this.config.floors.find(f=>f.id===this.floorId);this.isolatedRooms ||= {};
      const isolation=element('select',{'aria-label':'Isolate room',title:'Isolate a room for an unobstructed view',className:'room-isolation',onchange:e=>{this.isolatedRooms[this.floorId]=e.target.value;this.render();}},[element('option',{value:'',text:'Whole floor',selected:!this.isolatedRooms[this.floorId]}),...(activeFloor?.rooms||[]).map(r=>element('option',{value:r.id,text:r.name||r.id,selected:this.isolatedRooms[this.floorId]===r.id}))]);modes.append(isolation);
    }
    if(this.config.floors.length)header.append(modes);
    if(['3d','sims'].includes(mode)&&!exterior&&this.config.floors.length>1)tabs.append(iconButton('All storeys','floor',()=>{if(this.isolatedRooms?.[this.floorId]){this.isolatedRooms[this.floorId]='';this.building=true;}else this.building=!this.building;this.render();},{'aria-pressed':String(!!this.building&&!this.isolatedRooms?.[this.floorId])}));
    if(['3d','sims'].includes(mode)&&this.config.exterior?.items.length)tabs.append(iconButton('Exterior','cube',()=>{this.exterior=!this.exterior;this.render();},{'aria-pressed':String(!!this.exterior)}));
    const stageTools=element('div',{className:'stage-tools'},[tabs,iconButton(this.hideOverlays?'Show overlays':'Hide overlays','eye',()=>{this.hideOverlays=!this.hideOverlays;this.render();},{'aria-pressed':String(!!this.hideOverlays),title:this.hideOverlays?'Show overlays':'Hide overlays',className:'overlay-toggle'})]);
    stageTools.append(iconButton(this.inspectorOpen?'Hide lighting':'Lighting','bulb',()=>{this.inspectorOpen=!this.inspectorOpen;this.render();},{'aria-expanded':String(!!this.inspectorOpen),'aria-controls':'lighting-panel',title:this.inspectorOpen?'Hide lighting':'Lighting',className:'inspector-toggle'}));
    const settings=element('details',{className:'display-settings',open:!!this.displayOpen},[element('summary',{'aria-label':'Display settings',title:'Display settings'},[icon('sliders')]),element('div',{className:'display-popover'},[element('h3',{text:'Display settings'}),element('p',{className:'display-description',text:'Choose what stays visible on your floorplan.'}),...displayFields(display,next=>{this.displayPreferences=next;this.displayOpen=true;this.render();}),element('p',{className:'muted',text:'Saved for this browser. Set shared defaults in the card editor.'})])]);
    settings.addEventListener('toggle',()=>{if(settings.isConnected)this.displayOpen=settings.open;});
    // Icon-only controls must not retain an anonymous text flex item and its gap.
    for(const control of stageTools.querySelectorAll('.overlay-toggle,.inspector-toggle')){
      control.setAttribute('aria-label',control.textContent.trim());
      control.replaceChildren(control.querySelector('svg'));
    }
    const utilities=element('div',{className:'stage-utilities',role:'group','aria-label':'Floorplan tools'},[stageTools.querySelector('.overlay-toggle'),stageTools.querySelector('.inspector-toggle'),settings]);
    stageTools.append(utilities,header);
    this.headerSlot.replaceChildren();
    this.card.classList.toggle('inspector-collapsed',!this.inspectorOpen);
    this.controlsSlot.id='lighting-panel';
    this.controlsSlot.hidden=!this.inspectorOpen;
    const sourceFloor = this.config.floors.find(f => f.id === this.floorId);
    const isolatedRoom=['3d','sims'].includes(mode)&&sourceFloor?.rooms.some(r=>r.id===this.isolatedRooms?.[this.floorId])?this.isolatedRooms[this.floorId]:'';
    const floor=isolatedRoom?isolateRoomFloor(sourceFloor,isolatedRoom):sourceFloor;
    if (!floor || (!floor.image && !floor.rooms.length && !floor.walls?.length)) {
      this.plan?.dispose?.();this.plan=null;this.planKey=null;
      this.planSlot.replaceChildren(element('div',{className:'empty-plan'},[icon('floor'),element('h3',{text:'Make this space yours'}),element('p',{text:'Open the card editor to add your floorplan, furnish the rooms and place lights. The guided setup takes care of the configuration.'})]));
    }
    else {
      const markers = [];
      const markerFloors=this.building&&!isolatedRoom&&['3d','sims'].includes(mode)?this.config.floors:[floor];
      for(const floor of markerFloors) {
      markers.push(...labelMarkers(floor,states,entityId=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId},bubbles:true,composed:true}))));
      floor.entities.forEach(item => {
        const state = item.unbound?undefined:states[item.entity]; const light = item.entity.startsWith('light.');
        const name = item.name || state?.attributes.friendly_name || item.entity;
        const text = item.unbound?'Not connected':!available(state) ? 'Unavailable' : light ? state.state === 'on' ? 'On' : 'Off' : `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim();
        const marker = button('', () => {
          if(item.unbound)return;
          if (light) {
            if(['3d','sims'].includes(mode))this.activateLight(floor.id,item.entity);
            else if(this.selectionMode)this.toggle([item.entity]);
            else this.control(state?.state==='on'?'off':'on',undefined,[item.entity]);
          }
          else this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        }, { className: `marker ${light?'overlay-lights':'overlay-temperatures'} ${light ? state?.state === 'on' ? 'on' : '' : 'sensor'}`, title: `${name}: ${text}`, 'aria-label': `${name}: ${text}`, ...(light ? {disabled:this.busy || !available(state),'aria-description':this.selectionMode?'Select this light for group controls':'Toggle this light on or off',...(this.selectionMode?{'aria-pressed':String(this.selected.has(item.entity))}:{})} : {}) });
        marker.append(icon(light?(item.fixture || 'bulb'):item.entity.startsWith('binary_sensor.')?'presence':'temperature'));
        if(!light)marker.append(element('small',{text}));
        if(this.config.appearance?.labels)marker.append(element('span',{className:'marker-label',text:name}));
        markers.push({ node: marker, x: item.x, y: item.y, entity:item.entity, floorId:floor.id });
      });
      for(const room of floor.rooms || []) {
        const temperature=roomTemperature(room,states);
        const presence=roomState(room,states,floor);
        if((!temperature&&!presence.occupied) || !room.points?.length)continue;
        const centre=roomReadoutPoint(room,floor);
        const entityId=room.temperature_entity || roomPresence(room,floor).find(id=>states[id]?.state==='on');
        const label=[temperature?`${room.name} temperature: ${temperature}`:room.name,presence.occupied?'Presence detected':''].filter(Boolean).join(' · ');
        const marker=button(temperature,()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId},bubbles:true,composed:true})),{className:`marker overlay-temperatures temperature-marker temp-${temperatureTone(room.temperature_entity,states[room.temperature_entity])}${presence.occupied?' occupied':''}`,title:label,'aria-label':label});
        if(presence.occupied)marker.prepend(icon('presence'));
        markers.push({node:marker,x:centre[0],y:centre[1],floorId:floor.id});
      }
      for(const radiator of (floor.objects || []).filter(item=>item.type==='radiator' && item.heating_entity)) {
        const state=heatingState(states[radiator.heating_entity]);
        const marker=button('♨',()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:radiator.heating_entity},bubbles:true,composed:true})),{className:`marker overlay-heating radiator-control ${state==='heating'?'heating':''}`,title:`Radiator: ${state}`,'aria-label':`Radiator: ${state}`});
        markers.push({node:marker,x:radiator.x,y:radiator.y,floorId:floor.id});
      }
      }
      const options={...this.config.appearance,exterior,isolatedRoom,hideLightFixtures:display.hide_light_fixtures,hideRadiators:display.hide_radiators,hideExtractionFans:display.hide_extraction_fans,idleRotation:display.idle_rotation,labels:!this.hideOverlays&&this.config.appearance?.labels,hideOverlays:!!this.hideOverlays,mode,markers:this.hideOverlays||exterior?[]:markers,daylight,building:!!this.building&&!isolatedRoom,allFloors:this.config.floors};
      options.onLightClick=(floorId,id)=>this.activateLight(floorId,id);
      options.weather=weather;
      options.blindStates=this.blindStates;
      const baseCameraKey=`${floor.id}:${mode}:${!!this.building}`+(exterior?':exterior':''),cameraKey=baseCameraKey+(isolatedRoom?`:${isolatedRoom}`:'');this.viewStates ||= {};
      const baseView=this.viewStates[baseCameraKey] ||= {};options.viewState=this.viewStates[cameraKey] ||= {};
      for(const key of ['doors','portraits'])options.viewState[key]=baseView[key] ||= {};
      options.onViewChange=()=>this.saveView();
      const key=JSON.stringify([floor,exterior,display.hide_light_fixtures,display.hide_radiators,display.hide_extraction_fans,this.config.appearance,mode,!!this.building,this.building?this.config.floors:null]);
      if(key!==this.planKey || !this.plan) {
        this.plan?.dispose?.();
        this.plan=(['3d','sims'].includes(mode)?render3D:renderPlan)(floor,states,options);this.planKey=key;
        this.planSlot.replaceChildren(this.plan);
        this.planObserver?.disconnect();this.planObserver=new MutationObserver(()=>this.fitPlan());this.planObserver.observe(this.plan,{attributes:true,attributeFilter:['style']});
      } else this.plan.update?.(states,options);
      this.fitPlan();
      this.planSlot.querySelector('.outdoor-temperature')?.remove();
      const outdoorId=this.config.outdoor_temperature_entity, outdoor=roomTemperature({temperature_entity:outdoorId},states);
      if(outdoor&&!this.hideOverlays&&!(this.config.information?.enabled!==false&&this.config.information?.items?.some(i=>i.type==='weather'))){const readout=button(`Outside ${outdoor}`,()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:outdoorId},bubbles:true,composed:true})),{className:`outdoor-temperature temp-${temperatureTone(outdoorId,states[outdoorId])}`,'aria-label':`Outdoor temperature: ${outdoor}`});this.planSlot.append(readout);}
    }
    this.planSlot.querySelector('.stage-tools')?.remove();this.planSlot.append(stageTools);
    this.planSlot.querySelector('.information-panel')?.remove();
    const information=informationPanel(this,states);if(information)this.planSlot.append(information);
    this.fitPlan();
    const navigation=this.planSlot.querySelector('.plan-navigation,.three-toolbar');
    if(navigation && !navigation.classList.contains('docked-navigation')) {
      const three=navigation.classList.contains('three-toolbar'),buttons=[...navigation.children];
      navigation.removeAttribute('style');navigation.classList.add('docked-navigation');
      navigation.setAttribute('role','group');navigation.setAttribute('aria-label','Floorplan navigation');
      const groups=three?[['Rotate',0,2],['Zoom',2,4],['View',4,buttons.length]]:[['Zoom',0,2],['Move',2,6],['View',6,7],['Rotate',7,9]];
      navigation.replaceChildren(...groups.map(([name,start,end])=>{
        const controls=buttons.slice(start,end);controls.forEach(control=>control.removeAttribute('style'));
        return element('div',{className:'navigation-group',role:'group','aria-label':name},[element('span',{className:'navigation-caption',text:name}),element('div',{className:'navigation-buttons'},controls)]);
      }));
      if(three){buttons[4].textContent='Reset';const walls=buttons.find(b=>b.getAttribute('aria-label')==='Toggle cutaway walls');if(walls)walls.textContent='Walls';}
      this.planSlot.append(navigation);
    }
    const controls = element('section', { className: 'controls', 'aria-label': 'Light controls' });
    controls.append(element('div',{className:'inspector-heading'},[icon('bulb'),element('h3',{text:'Lighting'})]));
    const selectionTools=element('div',{className:'selection-tools'},[iconButton('Select lights','group',()=>{this.selectionMode=!this.selectionMode;if(!this.selectionMode)this.selected.clear();this.render();},{'aria-pressed':String(!!this.selectionMode),'aria-description':'Enable selection to adjust brightness, colour or multiple lights together'})]);
    controls.append(selectionTools);
    const choices=element('div',{className:'light-choices'});
    const groups = element('div', { className: 'row light-groups' });
    const collectionControls=(name,ids,state)=>{
      const onlineIds=[...new Set(ids)].filter(id=>available(states[id])),anyOn=onlineIds.some(id=>states[id].state==='on'),action=anyOn?'off':'on';
      const collection=element('div',{className:'collection-controls'});
      const power=button('',()=>this.control(action,undefined,ids),{className:'room-button',disabled:this.busy||!onlineIds.length,title:`${name}: ${!onlineIds.length?'Unavailable':anyOn?'On':'Off'} · Turn ${action}`,'aria-label':`Turn ${name} ${action}`,'aria-description':`Toggle all available lights in ${name}`});
      power.append(icon('power'),element('strong',{text:name}),element('small',{text:state?`${state.lightState}${state.presence?' · '+state.presence:''}`:!onlineIds.length?'Unavailable':anyOn?'On':'Off'}));
      const adjust=iconButton('Adjust','settings',()=>this.toggle(ids),{className:'collection-adjust','aria-label':`Adjust ${name}`,'aria-description':'Select these lights for brightness and colour controls',disabled:!ids.length,'aria-pressed':String(!!ids.length&&ids.every(id=>this.selected.has(id)))});
      collection.append(power,adjust);return collection;
    };
    if(floor?.rooms.length) {
      choices.append(element('h4',{className:'choices-heading',text:floor.name?`Rooms · ${floor.name}`:'Rooms'}));
      const rooms = element('div', { className: 'room-status', 'aria-label': 'Rooms' });
      rooms.style.gridTemplateColumns='1fr';
      for(const room of floor.rooms) {
        const state=roomState(room,states,floor);
        rooms.append(collectionControls(room.name,room.lights,state));
      }
      choices.append(rooms);
    }
    this.config.groups.forEach(group => groups.append(collectionControls(group.name,group.entities)));
    if (floor?.entities.some(e => e.entity.startsWith('light.'))) choices.append(button('Select floor', () => { this.selectionMode=true;this.inspectorOpen=true;floor.entities.filter(e => e.entity.startsWith('light.')).forEach(e => this.selected.add(e.entity)); this.render(); },{className:'select-floor'}));
    if(this.selected.size)selectionTools.append(button('Clear', () => { this.selected.clear(); this.render(); }));
    if(this.config.groups.length){const groupSection=element('details',{className:'group-section',open:this.groupsOpen??this.config.groups.length<=4},[element('summary',{text:`Light groups · ${this.config.groups.length}`}),element('p',{className:'muted',text:'Tap a group to switch its lights. Adjust selects them for dimming and colour.'}),groups]);groupSection.addEventListener('toggle',()=>{if(groupSection.isConnected)this.groupsOpen=groupSection.open;});choices.append(groupSection);}
    const selected = [...this.selected]; const unboundIds=new Set(this.config.floors.flatMap(f=>f.entities).filter(e=>e.unbound).map(e=>e.entity));const online = selected.filter(id => !unboundIds.has(id)&&available(states[id]));
    if(floor?.entities.length)controls.append(element('p', { text: selected.length ? `${selected.length} selected · ${online.length} available across floors` : this.selectionMode?'Choose lights on the plan, or use Adjust beside a room or group.':'Tap lights, rooms or groups to toggle power. Use Adjust or Select lights to dim or change colour.', role: 'status' }));
    if (selected.length) {
      controls.append(element('div', { className: 'row power-controls' }, [iconButton('Turn on','power', () => this.control('on'), { disabled: this.busy || !online.length }), iconButton('Turn off','power', () => this.control('off'), { disabled: this.busy || !online.length })]));
      const eligible = action => online.filter(id => capabilities(states[id])[action]);
      const brightness = eligible('brightness'); const colours = eligible('colour'); const temperatures = eligible('temperature');
      if (brightness.length) {
        const value = Math.round((states[brightness[0]].attributes.brightness ?? 255) / 255 * 100);
        const output = element('output', { text: `${value}%` });
        controls.append(field(`Brightness · ${brightness.length} of ${selected.length} lights`, element('input', { type: 'range', min: 1, max: 100, value: Math.max(1, value), disabled: this.busy, oninput: e => { output.textContent = `${e.target.value}%`; }, onchange: e => this.control('brightness', Number(e.target.value)) })), output);
      }
      if (colours.length) {
        const rgb = states[colours[0]].attributes.rgb_color || [255, 255, 255];
        controls.append(field(`Colour · ${colours.length} of ${selected.length} lights`, element('input', { type: 'color', value: '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), disabled: this.busy, onchange: e => this.control('colour', e.target.value.slice(1).match(/../g).map(v => parseInt(v, 16))) })));
      }
      if (temperatures.length) {
        const attributes = temperatures.map(id => states[id].attributes);
        controls.append(field(`White temperature · ${temperatures.length} of ${selected.length} lights (clamped to each light’s range)`, element('input', { type: 'range', min: Math.min(...attributes.map(a => a.min_color_temp_kelvin || 2000)), max: Math.max(...attributes.map(a => a.max_color_temp_kelvin || 6500)), step: 1, value: attributes[0].color_temp_kelvin || 3000, disabled: this.busy, onchange: e => this.control('temperature', Number(e.target.value)) })));
      }
      controls.append(element('p', { className: 'muted', text: 'Controls apply only to compatible, available lights. Slider and colour values start from the first compatible light.' }));
    }
    if (this.busy) controls.append(element('p', { text: 'Updating lights…', role: 'status' }));
    if (this.error) controls.append(element('p', { className: 'error', text: this.error, role: 'alert' }));
    controls.append(choices);
    this.controlsSlot.replaceChildren(controls);
    this.saveView();
    restoreFocus();
  }
}
customElements.define('floorplan-card', FloorplanCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'floorplan-card', name: 'Floorplan Card', description: 'Place lights and sensors on a floorplan, with capability-aware group controls.', preview: true });
