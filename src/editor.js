import { displayFields } from './display-settings.js';
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
  async uploadStyleImage(floorId,mode,file,objectId=null) {
    if(!file)return;this.uploadingStyle=true;this.error='';this.render();
    try {
      if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a PNG, JPEG, WebP or SVG smaller than 8 MB.');
      let url;
      if(file.type!=='image/svg+xml'&&this._hass?.fetchWithAuth){const body=new FormData();body.append('file',file);const response=await this._hass.fetchWithAuth('/api/image/upload',{method:'POST',body});if(!response.ok)throw Error('Home Assistant could not upload this image.');url=`/api/image/serve/${encodeURIComponent((await response.json()).id)}/original`;}
      else {if(file.size>2*1024*1024)throw Error('Embedded artwork must be smaller than 2 MB.');url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Artwork could not be read.'));reader.readAsDataURL(file);});}
      await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('This artwork could not be displayed.'));image.src=url;});
      const floor=this.config.floors.find(f=>f.id===floorId);if(!floor)throw Error('This floor was removed during upload.');const target=objectId?floor.objects.find(item=>item.id===objectId):floor;if(!target)throw Error('This furniture was removed during upload.');target.style_images ??= {};target.style_images[mode]=url;this.uploadingStyle=false;this.emit();
    }catch(error){this.uploadingStyle=false;this.error=error.message;this.render();}
  }
  async exportScene() {
    this.error = ''; this.exporting = true; this.render();
    try {
      const config = normaliseConfig(this.config);
      for (const floor of config.floors) for(const [container,key] of [[floor,'image'],...[floor,...floor.objects].flatMap(item=>Object.keys(item.style_images || {}).map(key=>[item.style_images,key]))]) {
        const imageUrl=container[key];if (!imageUrl || imageUrl.startsWith('data:')) continue;
        const response = this._hass?.fetchWithAuth && imageUrl.startsWith('/api/') ? await this._hass.fetchWithAuth(imageUrl) : await fetch(imageUrl);
        if (!response.ok) throw Error('Could not include a floor image. Check that its URL is accessible before exporting.');
        const blob = await response.blob(); if (blob.size > 8 * 1024 * 1024 || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(blob.type)) throw Error('Export images must be PNG, JPEG, WebP or SVG and smaller than 8 MB.');
        container[key] = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read an image for export.')); reader.readAsDataURL(blob); });
      }
      const blob = new Blob([JSON.stringify(config,null,2)],{type:'application/json'}); if (blob.size > 32 * 1024 * 1024) throw Error('This scene exceeds the 32 MB portable export limit. Use smaller images.');
      const url = URL.createObjectURL(blob); const link = element('a',{href:url,download:'floorplan-configuration.json'}); link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) { this.error = error.message; }
    this.exporting = false; this.render();
  }
  render() {
    if (!this.config) return;
    const root = element('div', { className: 'editor' });
    const steps = ['Floors', 'Rooms', 'Furniture', 'Entities', 'Groups', 'Review'];
    const stepIcons = ['floor','grid','sofa','bulb','group','check'];
    root.append(element('div',{className:'editor-heading'},[element('h2',{text:'Layout studio'}),element('p', { className: 'muted', text: `${steps[this.step]} · ${this.step + 1} / 6` }),button('Import / export',()=>{this.transferOpen=!this.transferOpen;this.render();},{'aria-expanded':String(!!this.transferOpen),'aria-controls':'configuration-transfer',className:'transfer-toggle'})]));
    const nav = element('nav', { className: 'row', 'aria-label': 'Setup steps' });
    steps.forEach((step,i) => { const item = button(`${i + 1}. ${step}`, () => { this.step = i; this.render(); }, { 'aria-pressed': String(i === this.step) }); item.prepend(icon(stepIcons[i])); nav.append(item); });
    root.append(nav);
    const toolbar=element('div',{className:'editor-toolbar'});
    const history=element('div',{className:'row history-controls'},[button('Undo',()=>this.restore('undo'),{disabled:!this.history?.past.length}),button('Redo',()=>this.restore('redo'),{disabled:!this.history?.future.length})]);
    if (this.step < 4 && this.config.floors.length) {
      const floors=element('select',{onchange:e=>{this.floorIndex=Number(e.target.value);this.pendingEntity='';this.pendingElement='';this.draft=[];this.drawing=false;this.roomId='';this.wallId='';this.wallDrawing=false;this.wallDraft=[];this.calibrating=false;this.calibrationPoints=[];this.selectedObject='';this.render();}});
      this.config.floors.forEach((floor,i)=>floors.append(element('option',{value:i,text:floor.name || floor.id,selected:this.floorIndex===i})));
      toolbar.append(field('Floor to configure',floors));
    }
    toolbar.append(history);root.append(toolbar);
    const floor=this.config.floors[this.floorIndex];
    if(this.step===0) root.append(floorSetup(this,floor));
    if(this.step===1) { if(floor) root.append(roomSetup(this,floor),structureSetup(this,floor)); else root.append(element('p',{text:'Add a floor in step 1 before drawing rooms.'})); }
    if(this.step===2) root.append(floor?furnitureSetup(this,floor):element('p',{text:'Add a floor in step 1 before placing furniture.'}));
    if(this.step===3) root.append(floor?entitySetup(this,floor):element('p',{text:'Add a floor in step 1 before placing entities.'}));
    if(this.step===4) root.append(groupSetup(this));
    if(this.step===5) {
      const mode = element('select',{onchange:e=>{this.config.appearance.mode=e.target.value;this.emit();}});
      for(const [value,text] of [['clean','2D'],['pokemon','Pokémon'],['zelda','Zelda'],['3d','3D'],['sims','Sims-like']]) mode.append(element('option',{value,text,selected:this.config.appearance?.mode===value}));
      root.append(element('fieldset',{},[element('legend',{text:'Display defaults'}),...displayFields(this.config.appearance.display,next=>{this.config.appearance.display=next;this.emit();})]));
      root.append(field('Render style',mode),field('Show room labels',element('input',{type:'checkbox',checked:!!this.config.appearance?.labels,onchange:e=>{this.config.appearance.labels=e.target.checked;this.emit();}})),field('Furniture visibility',element('input',{type:'range',min:.1,max:1,step:.05,value:this.config.appearance?.furniture_opacity ?? .55,onchange:e=>{this.config.appearance.furniture_opacity=Number(e.target.value);this.emit();}})));
      const quality=element('select',{onchange:e=>{this.config.appearance.quality=e.target.value;this.emit();}}); for(const value of ['auto','low','high'])quality.append(element('option',{value,text:value==='auto'?'Automatic':value==='low'?'Low — less detail':'High — more detail',selected:this.config.appearance.quality===value}));root.append(field('3D quality',quality));
      root.append(element('h3',{text:'Ready to save'}),element('p',{text:'Review each floor below, then use Home Assistant’s Save button to keep your setup. You can return to any step later.'}));
      const artwork=element('details',{open:!!this.styleArtworkOpen},[element('summary',{text:'Use your own Pokémon or Zelda artwork'}),element('p',{text:'Upload a finished floor background for each style, aligned to the same image bounds as the original floor. Room lighting, presence and editable furniture stay interactive. Keep game assets private; exports include these images.'})]);
      artwork.addEventListener('toggle',()=>{this.styleArtworkOpen=artwork.open;});
      for(const f of this.config.floors){const section=element('fieldset',{},[element('legend',{text:f.name || f.id})]);for(const [key,name] of [['pokemon','Pokémon'],['zelda','Zelda']]){section.append(field(`${name} background`,element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',disabled:!!this.uploadingStyle,onchange:e=>this.uploadStyleImage(f.id,key,e.target.files?.[0])})));if(f.style_images?.[key])section.append(button(`Remove ${name} background`,()=>{delete f.style_images[key];this.emit();}));}artwork.append(section);}root.append(artwork);
      for(const f of this.config.floors) {
        const preview=element('section',{className:'review-floor'},[element('h3',{text:f.name || f.id}),element('p',{text:`${f.entities.length} entities · ${f.rooms.length} rooms · ${f.objects?.length || 0} objects · ${f.walls?.length || 0} walls · ${f.rotation}° rotation`})]);
        preview.append((['3d','sims'].includes(this.config.appearance.mode)?render3D:renderPlan)(f,this._hass?.states || {},this.config.appearance));root.append(preview);
      }
      if(!this.config.floors.length) root.append(element('p',{text:'Start by adding a floor in step 1.'}));
      for(const f of this.config.floors) for(const r of f.rooms) if(!r.lights.length || !r.presence.length) root.append(element('p',{className:'muted',text:`${r.name}: ${!r.lights.length?'assign lights to show lit/dark state. ':''}${!r.presence.length?'Presence is optional and has not been assigned.':''}`}));
      root.append(element('p',{text:'Tap a light, room or group to toggle power. Use Adjust or Select lights for brightness and colour; controls only affect compatible, available lights.'}));
    }
    const transfer=element('section',{id:'configuration-transfer',className:'configuration-transfer',hidden:!this.transferOpen,'aria-label':'Full configuration transfer'},[element('h3',{text:'Move your configuration between environments'}),element('p',{text:'One JSON file contains all floors and embedded images, rooms, walls, furniture, light and sensor assignments, heating controls, groups and appearance settings. Keep it private; nothing needs to be committed to Git.'})]);
    const exportPanel=element('div',{},[element('h4',{text:'Export from dev'}),element('p',{text:'Download the complete configuration for this card. Live entity states and Home Assistant credentials are not included.'}),button(this.exporting?'Preparing export…':'Export full configuration',()=>this.exportScene(),{disabled:!!this.exporting})]);
    const importPanel=element('div',{},[element('h4',{text:'Import into production'}),element('p',{text:'Install the same or a newer card version, then choose the file here. Import replaces this card’s configuration; Undo restores it. Check entity IDs for the destination and use Home Assistant’s Save button.'})]);
    importPanel.append(field('Import configuration JSON',element('input',{type:'file',accept:'.json,application/json',onchange:async e=>{const file=e.target.files?.[0];if(!file)return;this.transferMessage='';try{if(file.size>32*1024*1024)throw Error('Choose a configuration smaller than 32 MB.');const raw=JSON.parse(await file.text());if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.floors))throw Error('Choose an exported floorplan configuration.');const imported=normaliseConfig(raw);this.config=imported;this.floorIndex=0;this.selectedObject='';this.roomId='';this.wallId='';this.pendingEntity='';this.pendingElement='';this.pendingObject='';this.draft=[];this.drawing=false;this.transferMessage=`Imported ${imported.floors.length} floors and ${imported.groups.length} groups. Review the assignments before saving.`;this.emit();}catch(error){this.error=`Configuration was not imported: ${error.message}`;this.render();}}})));
    transfer.append(element('div',{className:'transfer-columns'},[exportPanel,importPanel]));
    if(this.transferMessage)transfer.append(element('p',{role:'status',text:this.transferMessage}));
    root.querySelector('.editor-heading').after(transfer);
    if(this.error) root.append(element('p',{className:'error',role:'alert',text:this.error}));
    root.append(element('div',{className:'row wizard-footer'},[button('Back',()=>{this.step--;this.render();},{disabled:this.step===0}),button(this.step===5?'Back to floors':'Next',()=>{this.step=this.step===5?0:this.step+1;this.render();})]));
    this.disposePlans(); this.shadowRoot.replaceChildren(element('style',{text:styles}),root);
  }
}
customElements.define('floorplan-card-editor',FloorplanEditor);
