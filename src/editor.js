import { styles } from './styles.js';
import { normaliseConfig } from './lights.js';
import { element, button, field } from './dom.js';
import { floorSetup, roomSetup, entitySetup, groupSetup } from './setup.js';
export class FloorplanEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.floorIndex = 0; this.step = 0; this.pendingEntity = ''; this.draft = []; }
  setConfig(config) { this.config = normaliseConfig(config); this.render(); }
  set hass(value) { const first = !this._hass; this._hass = value; if (first && this.config) this.render(); }
  emit() {
    try { const config = normaliseConfig(this.config); this.error = ''; this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true })); }
    catch (error) { this.error = error.message; }
    this.render();
  }
  render() {
    if (!this.config) return;
    const root = element('div', { className: 'editor' });
    root.append(element('h2', { text: 'Set up your floorplan' }));
    const steps = ['Floors', 'Rooms', 'Entities', 'Groups', 'Review'];
    root.append(element('p', { className: 'muted', text: `Step ${this.step + 1} of 5 · ${steps[this.step]}` }));
    const nav = element('nav', { className: 'row', 'aria-label': 'Setup steps' });
    steps.forEach((step,i) => nav.append(button(`${i + 1}. ${step}`, () => { this.step = i; this.render(); }, { 'aria-pressed': String(i === this.step) })));
    root.append(nav);
    if (this.step < 3 && this.config.floors.length) {
      const floors=element('select',{onchange:e=>{this.floorIndex=Number(e.target.value);this.pendingEntity='';this.draft=[];this.drawing=false;this.roomId='';this.render();}});
      this.config.floors.forEach((floor,i)=>floors.append(element('option',{value:i,text:floor.name || floor.id,selected:this.floorIndex===i})));
      root.append(field('Floor to configure',floors));
    }
    const floor=this.config.floors[this.floorIndex];
    if(this.step===0) root.append(floorSetup(this,floor));
    if(this.step===1) root.append(floor?.image?roomSetup(this,floor):element('p',{text:'Add a floor image in step 1 before drawing rooms.'}));
    if(this.step===2) root.append(floor?.image?entitySetup(this,floor):element('p',{text:'Add a floor image in step 1 before placing entities.'}));
    if(this.step===3) root.append(groupSetup(this));
    if(this.step===4) {
      root.append(element('h3',{text:'Ready to save'}),element('p',{text:'Review each floor below, then use Home Assistant’s Save button to keep your setup. You can return to any step later.'}));
      for(const f of this.config.floors) root.append(element('p',{text:`${f.name || f.id}: ${f.entities.length} entities · ${f.rooms.length} rooms · ${f.rotation}° rotation${!f.image?' · Image needed':''}`}));
      if(!this.config.floors.length) root.append(element('p',{text:'Start by adding a floor in step 1.'}));
      for(const f of this.config.floors) for(const r of f.rooms) if(!r.lights.length || !r.presence.length) root.append(element('p',{className:'muted',text:`${r.name}: ${!r.lights.length?'assign lights to show lit/dark state. ':''}${!r.presence.length?'Presence is optional and has not been assigned.':''}`}));
      root.append(element('p',{text:'Tap light markers to build a selection. Room and group buttons select their lights. Power applies to all available selected lights; brightness and colour only affect compatible lights.'}));
    }
    if(this.error) root.append(element('p',{className:'error',role:'alert',text:this.error}));
    root.append(element('div',{className:'row wizard-footer'},[button('Back',()=>{this.step--;this.render();},{disabled:this.step===0}),button(this.step===4?'Back to floors':'Next',()=>{this.step=this.step===4?0:this.step+1;this.render();})]));
    this.shadowRoot.replaceChildren(element('style',{text:styles}),root);
  }
}
customElements.define('floorplan-card-editor',FloorplanEditor);
