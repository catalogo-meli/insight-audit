const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const [, , key, date, label, sourceCsv] = process.argv;

if (!key || !date || !label || !sourceCsv) {
  throw new Error('Usage: node scripts/update-embedded-data.js <run-key> <YYYY-MM-DD> <label> <csv-path>');
}

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

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
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
  const key = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

const html = fs.readFileSync(indexPath, 'utf8');
const match = html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) {
  throw new Error('Embedded data script not found.');
}

const raw = JSON.parse(match[1]);
const csvText = fs.readFileSync(sourceCsv, 'utf8');
raw.runs = raw.runs || {};
raw.datasetMeta = raw.datasetMeta || {};
raw.runs[key] = csvToObjects(csvText);
raw.datasetMeta[key] = {
  date,
  label,
  short: label.slice(0, 5),
};

const nextHtml = html.replace(
  match[0],
  `<script id="embedded-data" type="application/json">${JSON.stringify(raw)}</script>`,
);

fs.writeFileSync(indexPath, nextHtml, 'utf8');
console.log(`Embedded ${raw.runs[key].length} rows for ${label} from ${path.basename(sourceCsv)}.`);
