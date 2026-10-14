import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source=readFileSync(new URL('../tools/pwa-worker.js',import.meta.url),'utf8');
const saved=new Map<string,Map<string,Response>>();
function worker(revision='a',online=true){
 const callbacks=new Map<string,(event:any)=>void>();let requests=0,activated=0;
 const self={location:{href:'https://example.test/pvz/sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{activated++;},addEventListener:(type:string,fn:(event:any)=>void)=>callbacks.set(type,fn)};
 const ASSETS={'index.html':{revision,size:5},'assets/game.js':{revision,size:10},'assets/hd/actors.png':{revision:'same-art',size:20},'assets/original/plant_water.mp3':{revision:'same-audio',size:10}};
 const caches={open:async(name:string)=>{if(!saved.has(name))saved.set(name,new Map());const map=saved.get(name)!;return{match:async(key:string)=>map.get(key)?.clone(),put:async(key:string,response:Response)=>{map.set(key,response);}};}};
 runInNewContext(source,{self,caches,URL,ASSETS,SHELL:['index.html','assets/game.js'],RELEASE:revision,fetch:async()=>{requests++;if(!online)throw new Error('offline');return new Response('asset');}});
 return {
  requests:()=>requests,activated:()=>activated,
  install:async()=>{let pending:Promise<unknown>;callbacks.get('install')!({waitUntil:(p:Promise<unknown>)=>pending=p});await pending!;},
  fetch:async(url:string,mode='cors')=>{let response:Promise<Response>|undefined;callbacks.get('fetch')!({request:{url,mode,method:'GET'},waitUntil:(p:Promise<unknown>)=>p,respondWith:(p:Promise<Response>)=>response=p});return response;},
  message:async(action:string)=>{let pending:Promise<unknown>;const messages:any[]=[];callbacks.get('message')!({data:action,ports:[{postMessage:(m:unknown)=>messages.push(m)}],waitUntil:(p:Promise<unknown>)=>pending=p});await pending!;return messages;},
 };
}
test('PWA caches shell, downloads art and audio, and can restart without a network',async()=>{
 saved.clear();const first=worker();await first.install();assert.equal(first.requests(),2);
 assert.equal((await first.message('STATUS')).at(-1).count,2);
 assert.equal((await first.message('DOWNLOAD')).at(-1).count,4);
 const offline=worker('a',false);assert.equal(await (await offline.fetch('https://example.test/pvz/','navigate'))!.text(),'asset');
 assert.equal(await (await offline.fetch('https://example.test/pvz/assets/hd/actors.png'))!.text(),'asset');
 assert.equal(await (await offline.fetch('https://example.test/pvz/assets/original/plant_water.mp3'))!.text(),'asset');assert.equal(offline.requests(),0);
 assert.equal(await offline.fetch('https://example.test/kr3/'),undefined);assert.equal(await offline.fetch('https://another.test/pvz/','navigate'),undefined);
});
test('PWA reuses unchanged art on update and activates only on explicit command',async()=>{
 saved.clear();const old=worker();await old.install();await old.message('DOWNLOAD');const update=worker('b');await update.install();assert.equal(update.activated(),0);await update.message('DOWNLOAD');assert.equal(update.requests(),2);await update.message('ACTIVATE');assert.equal(update.activated(),1);
});
test('failed offline download reports error without pretending cache is complete',async()=>{
 saved.clear();const failed=worker('c',false);const result=await failed.message('DOWNLOAD');assert.equal(result.at(-1).type,'error');assert.equal((await failed.message('STATUS')).at(-1).count,0);
});
test('install manifest and HTML icons have their declared dimensions and relative app scope',()=>{
 const root=new URL('../public/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.webmanifest',root),'utf8'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const b=readFileSync(new URL(icon.src,root));assert.equal(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`,icon.sizes);}
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const path of ['icons/icon-16.png','icons/icon-32.png','icons/apple-touch-icon.png','icons/favicon.ico','manifest.webmanifest'])assert.ok(html.includes(path));
});
test('foreground resource response is not blocked by the offline-cache write', {timeout:1000}, async()=>{
 const callbacks=new Map<string,(event:any)=>void>();let finish!:()=>void,background!:Promise<unknown>,response!:Promise<Response>;
 const pending=new Promise<void>(resolve=>finish=resolve);let written=false;
 const self={location:{href:'https://example.test/sw.js'},addEventListener:(type:string,fn:(event:any)=>void)=>callbacks.set(type,fn)};
 const caches={open:async()=>({match:async()=>undefined,put:async()=>{await pending;written=true;}})};
 runInNewContext(source,{self,caches,URL,ASSETS:{'art.webp':{revision:'a',size:3}},SHELL:[],RELEASE:'a',fetch:async()=>new Response('art')});
 callbacks.get('fetch')!({request:{url:'https://example.test/art.webp',mode:'cors',method:'GET'},respondWith:(p:Promise<Response>)=>response=p,waitUntil:(p:Promise<unknown>)=>background=p});
 try { assert.equal(await (await response).text(),'art');assert.equal(written,false); }
 finally { finish(); }
 await background;assert.equal(written,true);
});
