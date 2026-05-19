const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

const dataMatch = html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!dataMatch) {
  throw new Error('Embedded data not found.');
}

const raw = JSON.parse(dataMatch[1]);
console.log(`JS syntax OK: ${scripts.length} script(s)`);
console.log(`Rows: total=${raw.total?.length || 0}, sdcIII=${raw.sdcIII?.length || 0}, tl=${raw.tl?.length || 0}`);

function makeEl(id, dataset = {}) {
  return {
    id,
    dataset,
    innerHTML: '',
    style: {},
    addEventListener() {},
    classList: { toggle() {} },
  };
}

const elements = new Map();
const getEl = (id) => {
  if (!elements.has(id)) {
    const el = makeEl(id);
    if (id === 'embedded-data') el.textContent = dataMatch[1];
    elements.set(id, el);
  }
  return elements.get(id);
};
const tabs = ['summary', 'pedagogy', 'patterns', 'base'].map((tab) => makeEl(`tab-${tab}`, { tab }));
const views = ['summary', 'pedagogy', 'patterns', 'base'].map((id) => getEl(id));

global.document = {
  getElementById: getEl,
  querySelector(selector) {
    if (selector === '.top-actions') return getEl('top-actions');
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.tab') return tabs;
    if (selector === '.view') return views;
    return [];
  },
  addEventListener(event, callback) {
    if (event === 'DOMContentLoaded') callback();
  },
};

const app = new Function(`${scripts.join('\n')}\nreturn { data, st, rows, setDataset };`)();
const initial = { dataset: app.st.dataset, rows: app.rows().length, header: getEl('top-actions').innerHTML };
app.setDataset('sdcIII');
const sdcIII = { dataset: app.st.dataset, rows: app.rows().length, header: getEl('top-actions').innerHTML };
app.setDataset('combined');
const combined = { dataset: app.st.dataset, rows: app.rows().length, header: getEl('top-actions').innerHTML };

console.log(`Runtime: ${initial.dataset}=${initial.rows}, ${sdcIII.dataset}=${sdcIII.rows}, ${combined.dataset}=${combined.rows}`);
if (!initial.header.includes('Muestra total Netkel') || !sdcIII.header.includes('SdC III') || !combined.header.includes('Vista combinada')) {
  throw new Error('Dataset selector did not render expected options.');
}
