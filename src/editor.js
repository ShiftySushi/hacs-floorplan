import { styles } from './styles.js';
import { normaliseConfig } from './lights.js';
import { element, button, field } from './dom.js';
import { floorSetup, roomSetup, entitySetup, groupSetup } from './setup.js';
import { furnitureSetup } from './furniture-editor.js';
import { structureSetup } from './structure-editor.js';
import { EditorHistory } from './editor-history.js';
import { icon } from './icons.js';
import { renderPlan } from './plan.js';
import { render3D } from './plan3d.js';
export class FloorplanEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.floorIndex = 0; this.step = 0; this.pendingEntity = ''; this.draft = []; }
  setConfig(config) { this.config = normaliseConfig(config); if (!this.history) this.history = new EditorHistory(this.config); else if (JSON.stringify(this.history.present) !== JSON.stringify(this.config)) this.history.reset(this.config); this.floorIndex = Math.min(this.floorIndex, Math.max(0,this.config.floors.length-1)); this.render(); }
  set hass(value) { const first = !this._hass; this._hass = value; if (first && this.config) this.render(); else this.shadowRoot.querySelectorAll('.plan').forEach(plan=>plan.update?.(value?.states || {})); }
  disposePlans() { this.shadowRoot.querySelectorAll('.plan').forEach(plan=>plan.dispose?.()); }
  disconnectedCallback() { this.disposePlans(); }
  connectedCallback() { if(this.config) this.render(); }
  emit(record = true) {
    try { const config = normaliseConfig(this.config); this.config = config; if (record) this.history.commit(config); this.error = ''; this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true })); }
    catch (error) { this.error = error.message; this.config = structuredClone(this.history.present); }
    this.render();
  }
  restore(direction) { const config = this.history[direction](); if (!config) return; this.config = config; this.floorIndex = Math.min(this.floorIndex, Math.max(0,config.floors.length-1)); this.draft = []; this.drawing = false; this.emit(false); }
  async exportScene() {
    this.error = ''; this.exporting = true; this.render();
    try {
      const config = structuredClone(this.config);
      for (const floor of config.floors) {
        if (!floor.image || floor.image.startsWith('data:')) continue;
        const response = this._hass?.fetchWithAuth && floor.image.startsWith('/api/') ? await this._hass.fetchWithAuth(floor.image) : await fetch(floor.image);
        if (!response.ok) throw Error('Could not include a floor image. Check that its URL is accessible before exporting.');
        const blob = await response.blob(); if (blob.size > 8 * 1024 * 1024 || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(blob.type)) throw Error('Export images must be PNG, JPEG, WebP or SVG and smaller than 8 MB.');
        floor.image = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read an image for export.')); reader.readAsDataURL(blob); });
      }
      const json = JSON.stringify(config,null,2); if (json.length > 32 * 1024 * 1024) throw Error('This scene exceeds the 32 MB portable export limit. Use smaller images.');
      const url = URL.createObjectURL(new Blob([json],{type:'application/json'})); const link = element('a',{href:url,download:'floorplan-scene.json'}); link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) { this.error = error.message; }
    this.exporting = false; this.render();
  }
  render() {
    if (!this.config) return;
    const root = element('div', { className: 'editor' });
    root.append(element('h2', { text: 'Set up your floorplan' }));
    const steps = ['Floors', 'Rooms', 'Furniture', 'Entities', 'Groups', 'Review'];
    const stepIcons = ['floor','grid','sofa','bulb','group','check'];
    root.append(element('p', { className: 'muted', text: `Step ${this.step + 1} of 6 · ${steps[this.step]}` }));
    const nav = element('nav', { className: 'row', 'aria-label': 'Setup steps' });
    steps.forEach((step,i) => { const item = button(`${i + 1}. ${step}`, () => { this.step = i; this.render(); }, { 'aria-pressed': String(i === this.step) }); item.prepend(icon(stepIcons[i])); nav.append(item); });
    root.append(nav);
    root.append(element('div',{className:'row history-controls'},[button('Undo',()=>this.restore('undo'),{disabled:!this.history?.past.length}),button('Redo',()=>this.restore('redo'),{disabled:!this.history?.future.length})]));
    if (this.step < 4 && this.config.floors.length) {
      const floors=element('select',{onchange:e=>{this.floorIndex=Number(e.target.value);this.pendingEntity='';this.draft=[];this.drawing=false;this.roomId='';this.wallId='';this.wallDrawing=false;this.wallDraft=[];this.calibrating=false;this.calibrationPoints=[];this.selectedObject='';this.render();}});
      this.config.floors.forEach((floor,i)=>floors.append(element('option',{value:i,text:floor.name || floor.id,selected:this.floorIndex===i})));
      root.append(field('Floor to configure',floors));
    }
    const floor=this.config.floors[this.floorIndex];
    if(this.step===0) root.append(floorSetup(this,floor));
    if(this.step===1) { if(floor) root.append(roomSetup(this,floor),structureSetup(this,floor)); else root.append(element('p',{text:'Add a floor in step 1 before drawing rooms.'})); }
    if(this.step===2) root.append(floor?furnitureSetup(this,floor):element('p',{text:'Add a floor in step 1 before placing furniture.'}));
    if(this.step===3) root.append(floor?entitySetup(this,floor):element('p',{text:'Add a floor in step 1 before placing entities.'}));
    if(this.step===4) root.append(groupSetup(this));
    if(this.step===5) {
      const mode = element('select',{onchange:e=>{this.config.appearance.mode=e.target.value;this.emit();}});
      for(const [value,text] of [['clean','Clean 2D'],['pokemon','Pokémon-inspired'],['zelda','Zelda-inspired'],['3d','Furnished 3D']]) mode.append(element('option',{value,text,selected:this.config.appearance?.mode===value}));
      root.append(field('Render style',mode),field('Show room labels',element('input',{type:'checkbox',checked:!!this.config.appearance?.labels,onchange:e=>{this.config.appearance.labels=e.target.checked;this.emit();}})),field('Furniture visibility',element('input',{type:'range',min:.1,max:1,step:.05,value:this.config.appearance?.furniture_opacity ?? .55,onchange:e=>{this.config.appearance.furniture_opacity=Number(e.target.value);this.emit();}})));
      const quality=element('select',{onchange:e=>{this.config.appearance.quality=e.target.value;this.emit();}}); for(const value of ['auto','low','high'])quality.append(element('option',{value,text:value==='auto'?'Automatic':value==='low'?'Low — less detail':'High — more detail',selected:this.config.appearance.quality===value}));root.append(field('3D quality',quality));
      root.append(element('h3',{text:'Ready to save'}),element('p',{text:'Review each floor below, then use Home Assistant’s Save button to keep your setup. You can return to any step later.'}));
      for(const f of this.config.floors) {
        const preview=element('section',{className:'review-floor'},[element('h3',{text:f.name || f.id}),element('p',{text:`${f.entities.length} entities · ${f.rooms.length} rooms · ${f.objects?.length || 0} objects · ${f.walls?.length || 0} walls · ${f.rotation}° rotation`})]);
        preview.append((this.config.appearance.mode==='3d'?render3D:renderPlan)(f,this._hass?.states || {},this.config.appearance));root.append(preview);
      }
      if(!this.config.floors.length) root.append(element('p',{text:'Start by adding a floor in step 1.'}));
      for(const f of this.config.floors) for(const r of f.rooms) if(!r.lights.length || !r.presence.length) root.append(element('p',{className:'muted',text:`${r.name}: ${!r.lights.length?'assign lights to show lit/dark state. ':''}${!r.presence.length?'Presence is optional and has not been assigned.':''}`}));
      root.append(element('p',{text:'Tap light markers to build a selection. Room and group buttons select their lights. Power applies to all available selected lights; brightness and colour only affect compatible lights.'}));
    }
    const transfer=element('details',{},[element('summary',{text:'Import or export your private scene'}),element('p',{text:'Export includes your floor images and positions. Keep this file private. Import replaces this card’s scene; Undo restores the previous setup.'}),button(this.exporting?'Preparing export…':'Export portable scene',()=>this.exportScene(),{disabled:!!this.exporting})]);
    transfer.append(field('Import scene JSON',element('input',{type:'file',accept:'.json,application/json',onchange:async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>32*1024*1024)throw Error('Choose a scene smaller than 32 MB.');const imported=normaliseConfig(JSON.parse(await file.text()));this.config=imported;this.floorIndex=0;this.emit();}catch(error){this.error=`Scene was not imported: ${error.message}`;this.render();}}})));root.append(transfer);
    if(this.error) root.append(element('p',{className:'error',role:'alert',text:this.error}));
    root.append(element('div',{className:'row wizard-footer'},[button('Back',()=>{this.step--;this.render();},{disabled:this.step===0}),button(this.step===5?'Back to floors':'Next',()=>{this.step=this.step===5?0:this.step+1;this.render();})]));
    this.disposePlans(); this.shadowRoot.replaceChildren(element('style',{text:styles}),root);
  }
}
customElements.define('floorplan-card-editor',FloorplanEditor);
