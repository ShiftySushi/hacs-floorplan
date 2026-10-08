// Contact sheet of every furniture type at the illustrated view's fixed angle, for judging
// which models need redesigning. Writes PNGs to asset-review/, which Git ignores; nothing here is shipped.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {CATALOGUE} from '../src/catalogue.js';

const variants=[['sofa','corner'],['bed','single'],['piano','grand'],['kitchen_unit','wall'],['kitchen_unit','cooker'],['kitchen_unit','extractor'],['kitchen_unit','glass'],['radiator','towel_rail'],['bookshelf','cubes'],['desk','plain'],['computer','ps5'],['computer','north'],['speaker','sub'],['extractor_fan','wall']];
const entries=[...CATALOGUE.map(item=>({...item,label:item.name})),...variants.map(([type,variant])=>({...CATALOGUE.find(item=>item.type===type),variant,label:`${CATALOGUE.find(item=>item.type===type).name} (${variant.replace('_',' ')})`}))];
// Twelve to a sheet keeps each model large enough to judge. Everything stands on the floor,
// wall fittings included, so each caption sits right under its model.
const columns=4,rowsPerSheet=3,perSheet=columns*rowsPerSheet,cell=2.8,width=columns*cell,depth=rowsPerSheet*cell,sheets=Math.ceil(entries.length/perSheet);
// Towards the south-east camera is straight down the screen, so a caption placed just in
// front of a model's footprint sits directly beneath it.
const at=slot=>[((slot%columns)+.4)/columns*100,(Math.floor(slot/columns)+.4)/rowsPerSheet*100];
const sheet=number=>entries.slice(number*perSheet,(number+1)*perSheet).map((entry,slot)=>{const [x,y]=at(slot);const below=Math.min(1.2,(entry.width+entry.depth)/4+.25);return {caption:entry.label,point:[x+below/width*100,y+below/depth*100],object:{id:`review-${slot}`,type:entry.type,...(entry.variant?{variant:entry.variant}:{}),x,y,width:entry.width,...(entry.type==='extractor_fan'&&entry.variant==='wall'?{depth:entry.height,height:entry.depth}:{depth:entry.depth,height:entry.height}),rotation:0}};});

const port=process.env.PORT||'8127',server=spawn(process.execPath,['scripts/serve-demo.mjs'],{stdio:'ignore',env:{...process.env,PORT:port}});
await new Promise(resolve=>setTimeout(resolve,1200));await mkdir('asset-review',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1600,height:1150}}),older=[];
try{
  await page.goto(`http://127.0.0.1:${port}/demo/`);await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-loading'));
  for(let number=0;number<sheets;number++){
    const items=sheet(number);
    const fallbacks=await page.evaluate(([items,width,depth])=>{
      const card=document.querySelector('floorplan-card'),config=JSON.parse(document.querySelector('#config').textContent);
      config.information={enabled:false,items:[]};
      config.floors=[{...config.floors[0],image:undefined,width_m:width,depth_m:depth,entities:[],walls:[],labels:[],objects:items.map(item=>item.object),rooms:[{id:'sheet',name:'Review',points:[[0,0],[100,0],[100,100],[0,100]],lights:[],presence:[],colour:'#d9d2c4'}]}];
      card.setConfig(config);card.hideOverlays=true;card.hass={...card._hass,states:{...card._hass.states,'sun.sun':{state:'above_horizon',attributes:{elevation:50}}}};
      // Wait for the view to settle, then caption each model where it is drawn.
      return new Promise(resolve=>setTimeout(()=>{
        const plan=card.plan,floorId=card.config.floors[0].id,fallbacks=plan.stats().fallbacks;
        for(const [slot,item] of items.entries()){
          const [left,top]=plan.locate(floorId,item.point),caption=document.createElement('div'),old=fallbacks.includes(item.object.id);
          caption.textContent=item.caption+(old?' · older model':'');caption.style.cssText=`position:absolute;left:${left}%;top:${top}%;transform:translate(-50%,0);font:600 13px system-ui;padding:3px 8px;border-radius:6px;white-space:nowrap;color:#fff;background:${old?'#a8452c':'#24303d'}`;
          plan.append(caption);
        }
        resolve(items.filter(item=>fallbacks.includes(item.object.id)).map(item=>item.caption));
      },5000));
    },[items,width,depth]);
    older.push(...fallbacks);await page.locator('floorplan-card').screenshot({path:`asset-review/asset-review-${number+1}.png`});
  }
  console.log(`${entries.length} models drawn on ${sheets} sheets (asset-review/asset-review-1.png onwards).`);
  console.log(`${older.length} still use the older generic model: ${older.join(', ')}`);
}finally{await browser.close();server.kill();}
