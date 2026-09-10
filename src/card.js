import { available, capabilities, normaliseConfig, serviceCalls } from './lights.js';
import { styles } from './styles.js';
import { element, button, field } from './dom.js';
import { renderPlan } from './plan.js';
import { roomState } from './rooms.js';
export class FloorplanCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' }); this.selected = new Set(); this.busy = false;
    this.shadowRoot.addEventListener('focusout', e => {
      if (e.target.tagName === 'INPUT' && this.deferredUpdate) requestAnimationFrame(() => { this.deferredUpdate = false; this.render(); });
    });
  }
  static getConfigElement() { return document.createElement('floorplan-card-editor'); }
  static getStubConfig() { return { type: 'custom:floorplan-card', title: 'Floorplan', floors: [], groups: [] }; }
  setConfig(config) {
    this.config = normaliseConfig(config);
    if (!this.config.floors.some(f => f.id === this.floorId)) this.floorId = this.config.floors[0]?.id;
    const configured = new Set([...this.config.floors.flatMap(f => [...f.entities.map(e => e.entity), ...f.rooms.flatMap(r => r.lights)]), ...this.config.groups.flatMap(g => g.entities)]);
    this.selected = new Set([...this.selected].filter(id => configured.has(id))); this.render();
  }
  set hass(hass) { this._hass = hass; if (!['INPUT', 'SELECT'].includes(this.shadowRoot.activeElement?.tagName)) this.render(); else this.deferredUpdate = true; }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }
  toggle(ids) {
    const remove = ids.every(id => this.selected.has(id));
    ids.forEach(id => remove ? this.selected.delete(id) : this.selected.add(id)); this.render();
  }
  async control(action, value) {
    if (this.busy) return;
    this.busy = true; this.error = ''; this.render();
    try {
      const calls = serviceCalls(this._hass?.states || {}, [...this.selected], action, value);
      const results = await Promise.allSettled(calls.map(call => this._hass.callService('light', call.service, call.data)));
      if (results.some(result => result.status === 'rejected')) this.error = 'Some lights could not be updated. Check their state and try again.';
    } catch { this.error = 'The light command could not be sent. Please try again.'; }
    finally { this.busy = false; this.render(); }
  }
  render() {
    if (!this.config) return;
    const states = this._hass?.states || {};
    const card = element('ha-card');
    const header = element('header', {}, [element('h2', { text: this.config.title })]);
    const tabs = element('div', { className: 'row', role: 'group', 'aria-label': 'Floors' });
    this.config.floors.forEach(floor => tabs.append(button(floor.name || floor.id, () => { this.floorId = floor.id; this.render(); }, { 'aria-pressed': String(floor.id === this.floorId) })));
    header.append(tabs); card.append(header);
    const floor = this.config.floors.find(f => f.id === this.floorId);
    if (!floor?.image) card.append(element('p', { className: 'hint', text: 'Open the card editor for guided setup: add a floor image, draw rooms, then place lights and sensors. No YAML needed.' }));
    else {
      const markers = [];
      floor.entities.forEach(item => {
        const state = states[item.entity]; const light = item.entity.startsWith('light.');
        const name = item.name || state?.attributes.friendly_name || item.entity;
        const text = !available(state) ? 'Unavailable' : light ? state.state === 'on' ? 'On' : 'Off' : `${state.state} ${state.attributes.unit_of_measurement || ''}`.trim();
        const marker = button('', () => {
          if (light) this.toggle([item.entity]);
          else this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: item.entity }, bubbles: true, composed: true }));
        }, { className: `marker ${light ? state?.state === 'on' ? 'on' : '' : 'sensor'}`, title: `${name}: ${text}`, 'aria-label': `${name}: ${text}`, ...(light ? { 'aria-pressed': String(this.selected.has(item.entity)) } : {}) });
        marker.append(element('span', { text: name }), element('small', { text }));
        markers.push({ node: marker, x: item.x, y: item.y });
      }); card.append(renderPlan(floor, states, { markers }));
    }
    const controls = element('section', { className: 'controls', 'aria-label': 'Light controls' });
    const groups = element('div', { className: 'row' });
    if(floor?.rooms.length) {
      const rooms = element('div', { className: 'room-status', 'aria-label': 'Rooms' });
      for(const room of floor.rooms) {
        const state=roomState(room,states);
        const row=button('',()=>this.toggle(room.lights),{className:'room-button',disabled:!room.lights.length,'aria-pressed':String(!!room.lights.length && room.lights.every(id=>this.selected.has(id)))});
        row.append(element('strong',{text:room.name}),element('small',{text:`${state.lightState}${state.presence?' · '+state.presence:''}`}));rooms.append(row);
      }
      controls.append(rooms);
    }
    this.config.groups.forEach(group => groups.append(button(group.name, () => this.toggle(group.entities), { disabled: !group.entities.length, 'aria-pressed': String(!!group.entities.length && group.entities.every(id => this.selected.has(id))) })));
    if (floor?.entities.some(e => e.entity.startsWith('light.'))) groups.append(button('Select floor', () => { floor.entities.filter(e => e.entity.startsWith('light.')).forEach(e => this.selected.add(e.entity)); this.render(); }));
    groups.append(button('Clear', () => { this.selected.clear(); this.render(); }, { disabled: !this.selected.size })); controls.append(groups);
    const selected = [...this.selected]; const online = selected.filter(id => available(states[id]));
    controls.append(element('p', { text: selected.length ? `${selected.length} selected · ${online.length} available (across all floors)` : 'Tap lights to select one or more, then choose a control.', role: 'status' }));
    if (selected.length) {
      controls.append(element('div', { className: 'row' }, [button('Turn on', () => this.control('on'), { disabled: this.busy || !online.length }), button('Turn off', () => this.control('off'), { disabled: this.busy || !online.length })]));
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
    card.append(controls); this.shadowRoot.replaceChildren(element('style', { text: styles }), card);
  }
}
customElements.define('floorplan-card', FloorplanCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'floorplan-card', name: 'Floorplan Card', description: 'Place lights and sensors on a floorplan, with capability-aware group controls.', preview: true });
