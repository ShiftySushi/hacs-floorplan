import { available, capabilities, normaliseConfig, serviceCalls } from './lights.js';
import { styles } from './styles.js';
import { element, button, field, preserveFocus } from './dom.js';
import { renderPlan } from './plan.js';
import { roomState } from './rooms.js';
import { icon, iconButton } from './icons.js';
import { render3D } from './plan3d.js';
import { roomTemperature, roomReadoutPoint, heatingState, temperatureTone } from './heating.js';
export class FloorplanCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' }); this.selected = new Set(); this.busy = false;
    this.shadowRoot.addEventListener('focusout', e => {
      if (e.target.tagName === 'INPUT' && this.deferredUpdate) requestAnimationFrame(() => { this.deferredUpdate = false; this.render(); });
    });
  }
  static getConfigElement() { return document.createElement('floorplan-card-editor'); }
  connectedCallback() { if (this.config) this.render(); }
  disconnectedCallback() { this.plan?.dispose?.(); this.plan=null; this.planKey=null; this.stageObserver?.disconnect(); this.planObserver?.disconnect(); }
  fitPlan() {
    if(!this.plan || !this.planSlot?.clientWidth)return;
    const ratioText=this.plan.style.aspectRatio || '1.15',parts=ratioText.split('/').map(Number),ratio=parts.length===2?parts[0]/parts[1]:parts[0];
    if(!Number.isFinite(ratio) || ratio<=0)return;
    const bounds=getComputedStyle(this.planSlot), availableWidth=this.planSlot.clientWidth-parseFloat(bounds.paddingLeft)-parseFloat(bounds.paddingRight),availableHeight=this.planSlot.clientHeight-parseFloat(bounds.paddingTop)-parseFloat(bounds.paddingBottom);
    const width=Math.max(1,Math.min(availableWidth,availableHeight*ratio)),height=width/ratio;
    for(const [key,value] of [['width',`${width}px`],['height',`${height}px`],['minHeight','0px']])if(this.plan.style[key]!==value)this.plan.style[key]=value;
  }
  static getStubConfig() { return { type: 'custom:floorplan-card', title: 'Floorplan', floors: [], groups: [] }; }
  setConfig(config) {
    if (config.appearance?.mode !== this.config?.appearance?.mode) this.viewMode=null;
    this.config = normaliseConfig(config);
    if (!this.config.floors.some(f => f.id === this.floorId)) this.floorId = this.config.floors[0]?.id;
    const configured = new Set([...this.config.floors.flatMap(f => [...f.entities.map(e => e.entity), ...f.rooms.flatMap(r => r.lights)]), ...this.config.groups.flatMap(g => g.entities)]);
    this.selected = new Set([...this.selected].filter(id => configured.has(id))); this.render();
  }
  set hass(hass) { this._hass = hass; if (!['INPUT', 'SELECT'].includes(this.shadowRoot.activeElement?.tagName)) this.render(); else this.deferredUpdate = true; }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }
  toggle(ids) {
    this.selectionMode=true;
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
  render() {
    if (!this.config) return;
    const restoreFocus=preserveFocus(this.shadowRoot);
    const states = {...this._hass?.states};
    for(const item of this.config.floors.flatMap(f=>f.entities))if(item.unbound)delete states[item.entity];
    if (!this.card) {
      this.card=element('ha-card',{className:'floorplan-dashboard'});
      this.headerSlot=element('div');this.planSlot=element('div',{className:'plan-slot'});this.controlsSlot=element('div',{className:'inspector-slot'});
      this.card.append(this.headerSlot,element('div',{className:'card-workspace'},[this.planSlot,this.controlsSlot]));
      this.shadowRoot.replaceChildren(element('style',{text:styles}),this.card);
    }
    this.stageObserver ||= new ResizeObserver(()=>this.fitPlan());this.stageObserver.observe(this.planSlot);
    this.planSlot.classList.toggle('has-outdoor',!!roomTemperature({temperature_entity:this.config.outdoor_temperature_entity},states));
    const title=element('div',{className:'card-title'},[icon('floor'),element('h2',{text:this.config.title})]);
    const header = element('header', {className:'card-header'}, [title]);
    const tabs = element('div', { className: 'row floor-tabs', role: 'group', 'aria-label': 'Floors' });
    this.config.floors.forEach(floor => tabs.append(iconButton(floor.name || floor.id,'floor', () => { this.floorId = floor.id; this.render(); }, { 'aria-pressed': String(floor.id === this.floorId) })));
    header.append(tabs);
    const mode=this.viewMode || this.config.appearance?.mode || 'clean';
    const modes=element('div',{className:'row view-modes',role:'group','aria-label':'Render style'});
    for(const [id,label,glyph] of [['clean','Clean 2D','grid'],['pokemon','Pokémon style','grid'],['zelda','Zelda style','grid'],['3d','Furnished 3D','cube']]) modes.append(iconButton(label,glyph,()=>{this.viewMode=id;this.render();},{'aria-pressed':String(mode===id)}));
    if(this.config.floors.length)header.append(modes);
    if(mode==='3d'&&this.config.floors.length>1)header.append(iconButton('All storeys','floor',()=>{this.building=!this.building;this.render();},{'aria-pressed':String(!!this.building)}));
    this.headerSlot.replaceChildren(header);
    const floor = this.config.floors.find(f => f.id === this.floorId);
    if (!floor || (!floor.image && !floor.rooms.length && !floor.walls?.length)) {
      this.plan?.dispose?.();this.plan=null;this.planKey=null;
      this.planSlot.replaceChildren(element('div',{className:'empty-plan'},[icon('floor'),element('h3',{text:'Make this space yours'}),element('p',{text:'Open the card editor to add your floorplan, furnish the rooms and place lights. The guided setup takes care of the configuration.'})]));
    }
    else {
      const markers = [];
      floor.entities.forEach(item => {
        const state = item.unbound?undefined:states[item.entity]; const light = item.entity.startsWith('light.');
        const name = item.name || state?.attributes.friendly_name || item.entity;
        const text = item.unbound?'Not connected':!available(state) ? 'Unavailable' : light ? state.state === 'on' ? 'On' : 'Off' : `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim();
        const marker = button('', () => {
          if(item.unbound)return;
          if (light) {
            if(this.selectionMode)this.toggle([item.entity]);
            else this.control(state?.state==='on'?'off':'on',undefined,[item.entity]);
          }
          else this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        }, { className: `marker ${light ? state?.state === 'on' ? 'on' : '' : 'sensor'}`, title: `${name}: ${text}`, 'aria-label': `${name}: ${text}`, ...(light ? {disabled:this.busy || !available(state),'aria-description':this.selectionMode?'Select this light for group controls':'Toggle this light on or off',...(this.selectionMode?{'aria-pressed':String(this.selected.has(item.entity))}:{})} : {}) });
        marker.append(icon(light?(item.fixture || 'bulb'):item.entity.startsWith('binary_sensor.')?'presence':'temperature'));
        if(!light)marker.append(element('small',{text}));
        if(this.config.appearance?.labels)marker.append(element('span',{className:'marker-label',text:name}));
        markers.push({ node: marker, x: item.x, y: item.y });
      });
      for(const room of floor.rooms || []) {
        const temperature=roomTemperature(room,states);
        const presence=roomState(room,states);
        if((!temperature&&!presence.occupied) || !room.points?.length)continue;
        const centre=roomReadoutPoint(room,floor);
        const entityId=room.temperature_entity || room.presence.find(id=>states[id]?.state==='on');
        const label=[temperature?`${room.name} temperature: ${temperature}`:room.name,presence.occupied?'Presence detected':''].filter(Boolean).join(' · ');
        const marker=button(temperature,()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId},bubbles:true,composed:true})),{className:`marker temperature-marker temp-${temperatureTone(room.temperature_entity,states[room.temperature_entity])}${presence.occupied?' occupied':''}`,title:label,'aria-label':label});
        if(presence.occupied)marker.prepend(icon('presence'));
        markers.push({node:marker,x:centre[0],y:centre[1]});
      }
      for(const radiator of (floor.objects || []).filter(item=>item.type==='radiator' && item.heating_entity)) {
        const state=heatingState(states[radiator.heating_entity]);
        const marker=button('♨',()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:radiator.heating_entity},bubbles:true,composed:true})),{className:`marker radiator-control ${state==='heating'?'heating':''}`,title:`Radiator: ${state}`,'aria-label':`Radiator: ${state}`});
        markers.push({node:marker,x:radiator.x,y:radiator.y});
      }
      const options={...this.config.appearance,mode,markers,building:!!this.building,allFloors:this.config.floors};
      const key=JSON.stringify([floor,this.config.appearance,mode,!!this.building,this.building?this.config.floors:null]);
      if(key!==this.planKey || !this.plan) {
        this.plan?.dispose?.();
        this.plan=(mode==='3d'?render3D:renderPlan)(floor,states,options);this.planKey=key;
        this.planSlot.replaceChildren(this.plan);
        this.planObserver?.disconnect();this.planObserver=new MutationObserver(()=>this.fitPlan());this.planObserver.observe(this.plan,{attributes:true,attributeFilter:['style']});
      } else this.plan.update?.(states,options);
      this.fitPlan();
      this.planSlot.querySelector('.outdoor-temperature')?.remove();
      const outdoorId=this.config.outdoor_temperature_entity, outdoor=roomTemperature({temperature_entity:outdoorId},states);
      if(outdoor){const readout=button(`Outside ${outdoor}`,()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:outdoorId},bubbles:true,composed:true})),{className:`outdoor-temperature temp-${temperatureTone(outdoorId,states[outdoorId])}`,'aria-label':`Outdoor temperature: ${outdoor}`});this.planSlot.append(readout);}
    }
    const controls = element('section', { className: 'controls', 'aria-label': 'Light controls' });
    controls.append(element('div',{className:'inspector-heading'},[icon('bulb'),element('h3',{text:'Lighting'})]));
    const selectionTools=element('div',{className:'selection-tools'},[iconButton('Select lights','group',()=>{this.selectionMode=!this.selectionMode;if(!this.selectionMode)this.selected.clear();this.render();},{'aria-pressed':String(!!this.selectionMode),'aria-description':'Enable selection to adjust brightness, colour or multiple lights together'})]);
    controls.append(selectionTools);
    const choices=element('div',{className:'light-choices'});
    const groups = element('div', { className: 'row light-groups' });
    if(floor?.rooms.length) {
      choices.append(element('h4',{className:'choices-heading',text:floor.name?`Rooms · ${floor.name}`:'Rooms'}));
      const rooms = element('div', { className: 'room-status', 'aria-label': 'Rooms' });
      for(const room of floor.rooms) {
        const state=roomState(room,states);
        const row=button('',()=>this.toggle(room.lights),{className:'room-button',disabled:!room.lights.length,'aria-pressed':String(!!room.lights.length && room.lights.every(id=>this.selected.has(id)))});
        row.append(icon(state.occupied?'presence':'bulb'),element('strong',{text:room.name}),element('small',{text:`${state.lightState}${state.presence?' · '+state.presence:''}`}));rooms.append(row);
      }
      choices.append(rooms);
    }
    this.config.groups.forEach(group => groups.append(iconButton(group.name,'group', () => this.toggle(group.entities), { disabled: !group.entities.length, 'aria-pressed': String(!!group.entities.length && group.entities.every(id => this.selected.has(id))) })));
    if (floor?.entities.some(e => e.entity.startsWith('light.'))) choices.append(button('Select floor', () => { this.selectionMode=true;floor.entities.filter(e => e.entity.startsWith('light.')).forEach(e => this.selected.add(e.entity)); this.render(); },{className:'select-floor'}));
    if(this.selected.size)selectionTools.append(button('Clear', () => { this.selected.clear(); this.render(); }));
    if(this.config.groups.length){const groupSection=element('details',{className:'group-section',open:this.groupsOpen??this.config.groups.length<=4},[element('summary',{text:`Light groups · ${this.config.groups.length}`}),element('p',{className:'muted',text:'Select a group to adjust its lights together.'}),groups]);groupSection.addEventListener('toggle',()=>{this.groupsOpen=groupSection.open;});choices.append(groupSection);}
    const selected = [...this.selected]; const unboundIds=new Set(this.config.floors.flatMap(f=>f.entities).filter(e=>e.unbound).map(e=>e.entity));const online = selected.filter(id => !unboundIds.has(id)&&available(states[id]));
    if(floor?.entities.length)controls.append(element('p', { text: selected.length ? `${selected.length} selected · ${online.length} available across floors` : this.selectionMode?'Choose lights on the plan, a room or a group.':'Tap a light to toggle it. Select lights to dim or change colour.', role: 'status' }));
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
    restoreFocus();
  }
}
customElements.define('floorplan-card', FloorplanCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'floorplan-card', name: 'Floorplan Card', description: 'Place lights and sensors on a floorplan, with capability-aware group controls.', preview: true });
