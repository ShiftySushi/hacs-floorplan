export const furnitureStyles = `
.furniture-editor{container-type:inline-size}
.furniture-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0}
.furniture-header p{margin:0;font-size:12px;color:var(--secondary-text-color,#607078);line-height:1.5}
.furniture-header button{flex-shrink:0;font-size:12px}
.furniture-workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:0;align-items:stretch;border:1px solid var(--fp-line);border-radius:12px;overflow:clip}
.furniture-canvas{position:sticky;top:16px;align-self:start;min-width:0;padding:16px;background:var(--fp-soft);display:flex;flex-direction:column;align-items:center}
.furniture-canvas .plan{margin:0 auto;width:100%;max-width:none;background:transparent;border-radius:0}
.furniture-canvas>.row{justify-content:center;gap:8px;margin:12px 0}.furniture-panel>.row{gap:8px;margin-bottom:16px}
.furniture-canvas>.row button{min-width:36px;min-height:36px;padding:6px 9px}
.furniture-panel{min-width:0;padding:16px;border-left:1px solid var(--fp-line)}
.furniture-panel>details{margin:0 0 16px;border-top:0;padding:0;border-bottom:1px solid var(--fp-line);padding-bottom:12px}
.furniture-panel summary{font-weight:650;min-height:0;padding:4px 0 10px}
.furniture-panel label{font-size:12px;margin:12px 0}
.furniture-panel input:not([type=range]),.furniture-panel select{box-sizing:border-box;min-height:38px;padding:8px;font-size:12px;width:100%}
.furniture-panel .furniture-palette{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:250px;overflow:auto;margin:8px 0 0;padding:3px}
.furniture-panel .furniture-palette button{min-width:0;display:flex;flex-direction:column;gap:6px;align-items:center;padding:10px 4px;font-size:11px;line-height:1.25;overflow-wrap:anywhere;background:var(--fp-surface)}
.furniture-panel .furniture-palette button[aria-pressed=true]{background:var(--fp-accent);color:#fff}
.furniture-panel .furniture-palette svg{width:38px;height:38px}
.furniture-panel .furniture-palette button:has(small){grid-column:1/-1;display:grid;grid-template-columns:38px 1fr;text-align:left;padding:10px;column-gap:10px}
.furniture-panel .furniture-palette button:has(small) svg{grid-row:1/3}
.furniture-panel .furniture-palette small{grid-column:2;font-size:10px;opacity:.8}
.furniture-panel .object-inspector .product-field,.furniture-panel .object-inspector>a{grid-column:1/-1}
.furniture-panel .object-inspector>a{color:var(--fp-accent);font-size:12px}
.product-finishes button{display:flex;align-items:center;gap:6px;text-align:left}
.product-finishes button span{flex-shrink:0}
.furniture-actions{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 16px}
.furniture-actions:empty{display:none}
.furniture-actions button{flex:1;min-height:36px;padding:7px 8px;font-size:11px;flex-direction:column}
.furniture-actions button .icon{width:18px;height:18px}
.furniture-panel .object-inspector{display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;padding:12px;margin:16px 0;background:transparent}
.furniture-panel .object-inspector legend{font-size:12px;padding:0 5px}
.furniture-panel .object-inspector label{min-width:0;margin:0;font-size:11px;line-height:1.4}
.furniture-panel .object-inspector input,.furniture-panel .object-inspector select{width:100%;min-width:0;box-sizing:border-box}
.furniture-panel .object-inspector .row,.furniture-panel .object-inspector [data-keyboard-move],.furniture-panel .object-inspector p{grid-column:1/-1}
.furniture-panel .object-inspector .row{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.furniture-panel .object-inspector button{font-size:11px;padding:7px;min-height:34px}
.furniture-lock-hint{margin:10px 0 0;max-width:60ch;text-align:center;color:var(--secondary-text-color,#63776e);font-size:11px;line-height:1.4}
.furniture-placement{margin:0 0 12px;padding:10px;background:var(--fp-surface);border-radius:8px;font-size:12px}
.furniture-editor button:disabled{cursor:not-allowed}
.furniture-panel [data-object-tools]:focus{outline:2px solid var(--fp-accent);outline-offset:3px}
@container(max-width:760px){
 .furniture-workspace{grid-template-columns:1fr}
 .furniture-canvas{position:static;padding:12px}
 .furniture-panel{border-left:0;border-top:1px solid var(--fp-line);display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
 .furniture-panel>details,.furniture-panel>.object-inspector,.furniture-panel>.muted{grid-column:1/-1}
 .furniture-panel .furniture-palette{grid-template-columns:repeat(5,minmax(0,1fr));max-height:180px}
 .furniture-panel>label,.furniture-actions{margin:0;align-self:start}
 .furniture-header{gap:10px}.furniture-header p{font-size:11px}
}
@container(max-width:420px){
 .furniture-panel{padding:12px;display:block}.furniture-panel>label,.furniture-actions{margin:12px 0}
 .furniture-panel .furniture-palette{grid-template-columns:repeat(4,minmax(0,1fr))}
 .furniture-header button{font-size:11px;padding:8px}.furniture-header p{max-width:25ch}
}
`;
