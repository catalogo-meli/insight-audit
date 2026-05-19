const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const indexPath = path.join(root, 'index.html');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function canonicalHeader(value) {
  const clean = String(value || '').replace(/^\uFEFF/, '').trim();
  const key = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const map = {
    seccion: 'Seccion',
    accion: 'Accion',
    'codigo esperado': 'Codigo esperado',
    'codigo respondido': 'Codigo respondido',
    'coincide codigo': 'Coincide codigo',
  };
  return map[key] || clean;
}

function csvToObjects(text) {
  const parsed = parseCsv(text).filter((r) => r.some((c) => String(c || '').trim()));
  const headers = parsed.shift().map(canonicalHeader);
  return parsed.map((row) => {
    const out = {};
    headers.forEach((header, index) => {
      out[header] = (row[index] || '').trim();
    });
    return out;
  });
}

function dateLabel(date) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function runKey(date) {
  return `run${date.replaceAll('-', '')}`;
}

const files = fs.readdirSync(dataDir)
  .map((name) => {
    const match = name.match(/^insight-audit-sdc-(\d{4}-\d{2}-\d{2})\.csv$/);
    return match ? { name, date: match[1] } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.date.localeCompare(b.date));

if (!files.length) {
  throw new Error('No data files found. Expected data/insight-audit-sdc-YYYY-MM-DD.csv');
}

const html = fs.readFileSync(indexPath, 'utf8');
const match = html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) {
  throw new Error('Embedded data script not found.');
}

const raw = JSON.parse(match[1]);
raw.runs = {};
raw.datasetMeta = {};

for (const file of files) {
  const key = runKey(file.date);
  const label = dateLabel(file.date);
  const csvText = fs.readFileSync(path.join(dataDir, file.name), 'utf8');
  raw.runs[key] = csvToObjects(csvText);
  raw.datasetMeta[key] = { date: file.date, label, short: label.slice(0, 5) };
}

const nextHtml = html.replace(
  match[0],
  `<script id="embedded-data" type="application/json">${JSON.stringify(raw)}</script>`,
);

fs.writeFileSync(indexPath, nextHtml, 'utf8');
for (const key of Object.keys(raw.runs)) {
  console.log(`${raw.datasetMeta[key].label}: ${raw.runs[key].length} rows`);
}
