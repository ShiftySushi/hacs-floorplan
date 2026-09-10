export class EditorHistory {
  constructor(config, limit = 50) { this.limit = limit; this.reset(config); }
  reset(config) { this.present = structuredClone(config); this.past = []; this.future = []; }
  commit(config) {
    if (JSON.stringify(config) === JSON.stringify(this.present)) return;
    this.past.push(this.present); if (this.past.length > this.limit) this.past.shift();
    this.present = structuredClone(config); this.future = [];
  }
  undo() { if (!this.past.length) return null; this.future.push(this.present); this.present = this.past.pop(); return structuredClone(this.present); }
  redo() { if (!this.future.length) return null; this.past.push(this.present); this.present = this.future.pop(); return structuredClone(this.present); }
}
