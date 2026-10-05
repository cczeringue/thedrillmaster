import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function browser({host='www.thedrillmaster.gay', broken=false}={}) {
 const handlers={}, scripts=[];
 const document={title:'The Drillmaster',referrer:'https://example.com/?email=private',head:{appendChild(s){scripts.push(s)}},createElement:()=>({}),addEventListener(name,fn){handlers[name]=fn}};
 const window={location:{hostname:host,origin:`https://${host}`,pathname:'/VIP',search:'?email=private'},navigator:{},dataLayer:[]};
 if(broken)Object.defineProperty(window,'dataLayer',{get(){throw Error('blocked')}});
 const context={window,document,URL,Date};
 vm.runInNewContext(readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8'),context);
 return {window,handlers,scripts};
}
test('production tracks a sanitized page URL and disables advertising signals',()=>{
 const b=browser();assert.equal(b.scripts.length,1);
 const config=Array.from(b.window.dataLayer).map(x=>Array.from(x)).find(x=>x[0]==='config');
 assert.equal(config[2].page_location,'https://www.thedrillmaster.gay/VIP');
 assert.equal(config[2].page_referrer,'https://example.com/');
 assert.equal(config[2].allow_google_signals,false);
});
test('one event per ticket click, including nested targets and middle clicks, without intercepting checkout',()=>{
 const b=browser();const anchor={href:'https://app.opendate.io/confirms/752818/web_orders/new',dataset:{ticketPlacement:'hero'}};
 const target={closest:()=>anchor};let intercepted=false;
 b.handlers.click({target,button:0,preventDefault(){intercepted=true}});
 b.handlers.auxclick({target,button:1,preventDefault(){intercepted=true}});
 b.handlers.auxclick({target,button:2});
 const events=b.window.dataLayer.map(x=>Array.from(x)).filter(x=>x[0]==='event');
 assert.equal(events.length,2);assert.equal(events[0][1],'get_tickets_click');assert.equal(events[0][2].button_location,'hero');assert.equal(intercepted,false);
});
test('other links, local previews, and blocked analytics do not track or throw',()=>{
 const b=browser();b.handlers.click({target:{closest:()=>({href:'https://example.com',dataset:{}})},button:0});assert.equal(b.window.dataLayer.length,2);
 assert.equal(browser({host:'127.0.0.1'}).scripts.length,0);
 assert.doesNotThrow(()=>browser({broken:true}));
});
