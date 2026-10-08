// Run: node tests/smoke.cjs  — no npm dependencies required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const elements = new Map();
function node(key) {
  if (!elements.has(key)) elements.set(key, {
    innerHTML: '', textContent: '', clientWidth: 1000, scrollHeight: 1056,
    style: {setProperty() {}}, classList: {add() {}, remove() {}, toggle() {}},
    addEventListener() {}, appendChild() {}, remove() {},
    firstElementChild: {removeAttribute() {}, style: {}},
  });
  return elements.get(key);
}
const storage = new Map();
const document = {
  querySelector: node, body: node('body'), head: node('head'),
  createElement: n => node('created-' + n), addEventListener() {},
};
const context = vm.createContext({
  document, Blob, TextEncoder, URL, Date, Math, console,
  localStorage: {getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v)},
  window: {addEventListener() {}},
  requestAnimationFrame() {}, setTimeout() {return 0;}, clearTimeout() {},
  alert() {}, confirm() {return true;},
});
vm.runInContext(script, context);
const run = js => vm.runInContext(js, context);
(async () => {
  assert.match(node('#app').innerHTML, /My resumes/);
  assert.equal(run('store.docs.length'), 1);
  run('activeId=store.docs[0].id;renderEditor()');
  assert.match(node('#panelContent').innerHTML, /Personal details/);
  assert.match(node('#resumePaper').innerHTML, /Northstar Technologies/);
  assert.equal(run('analyze().score'), 100);
  assert.equal(run('jobKeywords("React TypeScript Python TypeScript Kubernetes",getPlainText(doc())).find(x=>x.word==="kubernetes").match'), false);
  run('doc().contact.fullName="Test Candidate";changed()');
  assert.equal(run('readStore().docs[0].contact.fullName'), 'Test Candidate');
  assert.equal(run('validateImport(JSON.parse(JSON.stringify(doc()))).sections.length'), 6);
  run('const n=newSection("awards");doc().sections.push(n)');
  assert.equal(run('doc().sections.length'), 7);
  const bytes = new Uint8Array(await run('makeDocx(doc())').arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(0,4)), 'PK\x03\x04');
  assert.equal(String.fromCharCode(...bytes.slice(-22,-18)), 'PK\x05\x06');
  assert.ok(bytes.length > 4000);
  console.log('PASS: dashboard, editor, preview, scoring, autosave, JSON, sections, DOCX ZIP');
})().catch(e => {console.error(e);process.exitCode=1;});
