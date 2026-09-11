// Runs before module loading so a cold start never exposes the unstyled editor.
try{document.documentElement.dataset.theme=localStorage.getItem('floorplan-preview-theme') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{}
const failBoot=event=>{
  if(event?.target&&event.target!==window&&!['SCRIPT','LINK'].includes(event.target.tagName))return;
  if(!document.documentElement.hasAttribute('data-loading'))return;
  const show=()=>{const loader=document.getElementById('boot');if(!loader)return;loader.classList.add('failed');loader.setAttribute('role','alert');loader.querySelector('strong').textContent='Unable to load the floorplan';loader.querySelector('p').textContent='The floorplan could not load. Your saved scene is still in this browser.';loader.querySelector('button').hidden=false;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
};
window.addEventListener('error',failBoot,true);window.addEventListener('unhandledrejection',failBoot);
window.floorplanReady=async card=>{
  const deadline=performance.now()+10000;
  do{await new Promise(requestAnimationFrame);const plan=card.shadowRoot?.querySelector('.plan-3d');if(!plan||plan.dataset.fittedBounds)break;if(performance.now()>deadline){failBoot();return;}}while(true);
  await new Promise(requestAnimationFrame);
  if(document.querySelector('#boot.failed'))return;
  document.documentElement.removeAttribute('data-loading');document.getElementById('boot')?.remove();
};
