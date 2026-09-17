#!/usr/bin/env node
/**
 * Outreach composer logic test. Run from the repo root:
 *   node scripts/test-outreach-composer.mjs
 *
 * Guards: optional token fill, editable body is copy source, Copy never blocked
 * by unfilled [Name]/[Company]/etc. Prose brackets stay as prose.
 */
import fs from 'node:fs';
import vm from 'node:vm';

function mkEl(id, tag='div') {
  return {
    id, tagName: tag, value: '', textContent: '', innerHTML: '',
    hidden: false, disabled: false, className: '', children: [],
    _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); },
    setAttribute(){}, appendChild(c){ this.children.push(c); },
    click(){ (this._listeners.click||[]).forEach(f=>f()); },
    input(){ (this._listeners.input||[]).forEach(f=>f()); },
    change(){ (this._listeners.change||[]).forEach(f=>f()); },
    closest(){ return null; },
    querySelector(){ return null; }
  };
}

const ids = ['outreach-composer','outreach-script-select','outreach-steps','outreach-preview','outreach-warn',
  'outreach-count','outreach-script-meta','outreach-status','outreach-var-name','outreach-var-company','outreach-var-city',
  'outreach-var-demo','outreach-var-phone','outreach-var-email','outreach-copy','outreach-text',
  'outreach-email','outreach-call','outreach-script-menu'];
const store = Object.fromEntries(ids.map(i=>[i, mkEl(i, i === 'outreach-preview' ? 'textarea' : 'div')]));

const seedSrc = fs.readFileSync('assets/js/outreach-scripts-seed.js','utf8');
let seeded = null;
let lastSelectOptions = [];

const sandbox = {
  console,
  localStorage: { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=v;} },
  document: {
    head: { appendChild(s){ // simulate loading the seed file
        vm.runInContext(seedSrc, ctx); s.onload(); } },
    getElementById: id => store[id] || null,
    createElement: t => mkEl('', t)
  },
  setTimeout,
  setBusinessDocSelectOptions(hidden, options, opts) {
    lastSelectOptions = options || [];
    if (hidden && opts && opts.value != null) hidden.value = String(opts.value);
  },
  setBusinessDocSelectValue(hidden, value) {
    if (hidden) hidden.value = value == null ? '' : String(value);
  },
  initBusinessDocCustomSelects() {}
};
sandbox.window = sandbox;
sandbox.navigator = { clipboard: { writeText: async () => {} } };
sandbox.rtdb = {}; sandbox.rtdbRef = (_d,p)=>p;
sandbox.rtdbGet = async () => ({ val: () => seeded });
sandbox.rtdbSet = async (_p, v) => { seeded = v; };
sandbox.rtdbUpdate = async (_p, patch) => { seeded = Object.assign({}, seeded||{}, patch); };

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('assets/js/outreach-composer.js','utf8'), ctx);

const ok = (c,m)=>{ console.log(`${c?'✓':'✗'} ${m}`); if(!c) process.exitCode=1; };
const body = () => store['outreach-preview'].value || store['outreach-preview'].textContent;

await sandbox.window.CWR_OUTREACH.open();

ok(lastSelectOptions.length===11, `11 scripts in dropdown (got ${lastSelectOptions.length})`);
ok(store['outreach-script-select'].value === lastSelectOptions[0].value, 'first script selected by default');
ok(store['outreach-steps'].children.length===4, `4 step buttons rendered`);
ok(seeded && Object.keys(seeded).length===11, `RTDB seeded with 11 scripts on first open`);

const warn = store['outreach-warn'], copy = store['outreach-copy'];
ok(copy.disabled===false, 'Copy enabled even with unfilled placeholders');
ok(!warn.hidden && /Still has/.test(warn.textContent), `soft hint shown: "${warn.textContent}"`);

store['outreach-var-name'].value='Maria';
store['outreach-var-company'].value='Valley Lawn Co';
store['outreach-var-city'].value='Fresno';
store['outreach-var-demo'].value='https://tradeservice.expo.app';
store['outreach-var-name'].input();

ok(copy.disabled===false, 'Copy stays enabled after fills');
ok(warn.hidden===true, 'hint cleared when tokens filled');
ok(body().includes('Maria'), 'preview substituted [Name] -> Maria');
ok(!body().includes('[Name]'), 'no [Name] token left in preview');

// edit in place — copy source is the textarea
store['outreach-preview'].value = 'Custom IG line for gotjunk559';
store['outreach-preview'].input();
ok(body() === 'Custom IG line for gotjunk559', 'edited body is the message source');

// prose brackets must NOT be treated as fillable
store['outreach-steps'].children[3].click();   // Call step
ok(body().includes('[later today / tomorrow]'), 'prose bracket preserved');
ok(!/Still has \[later/.test(warn.textContent || ''), 'prose bracket does not soft-flag');

const before = JSON.stringify(seeded);
await sandbox.window.CWR_OUTREACH.open();
ok(JSON.stringify(seeded)===before, 'second open does not overwrite RTDB');

store['outreach-var-demo'].value='';
const cleaning = lastSelectOptions.find(o => o.value === 'cleaning-ads');
ok(!!cleaning, 'cleaning-ads script present in options');
store['outreach-script-select'].value = cleaning.value;
store['outreach-script-select'].change();
ok(store['outreach-var-demo'].value==='https://procleaning.expo.app',
   `demo link prefilled from script data (got "${store['outreach-var-demo'].value}")`);
store['outreach-steps'].children[0].click();   // back to Text
ok(body().includes('procleaning.expo.app'), 'preview uses the prefilled demo link');
