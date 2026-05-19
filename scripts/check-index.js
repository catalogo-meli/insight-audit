const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

const dataMatch = html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!dataMatch) {
  throw new Error('Embedded data not found.');
}

const raw = JSON.parse(dataMatch[1]);
console.log(`JS syntax OK: ${scripts.length} script(s)`);
const runSummary = Object.entries(raw.runs || {}).map(([key, rows]) => `${key}=${rows.length}`).join(', ');
console.log(`Rows: ${runSummary}, tl=${raw.tl?.length || 0}`);

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

const app = new Function(`${scripts.join('\n')}\nreturn { data, st, rows, datasetKeys, toggleDataset, setAllDatasets, selectedDatasetLabel };`)();
const initial = { datasets: app.st.datasets.slice(), rows: app.rows().length, header: getEl('top-actions').innerHTML, label: app.selectedDatasetLabel() };
app.toggleDataset(app.datasetKeys[1]);
const single = { datasets: app.st.datasets.slice(), rows: app.rows().length, header: getEl('top-actions').innerHTML, label: app.selectedDatasetLabel() };
app.setAllDatasets();
const all = { datasets: app.st.datasets.slice(), rows: app.rows().length, header: getEl('top-actions').innerHTML, label: app.selectedDatasetLabel() };

console.log(`Runtime: initial=${initial.rows} (${initial.label}), single=${single.rows} (${single.label}), all=${all.rows} (${all.label})`);
if (!initial.header.includes('Todas') || !initial.header.includes('06/05') || !initial.header.includes('15/05')) {
  throw new Error('Date selector did not render expected options.');
}
