import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.resolve('nasdaq_screener_1760800568279.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');

const records = parse(csvData, {
  columns: true, // first row as header
  skip_empty_lines: true
});

// Transform CSV into symbol -> data mapping
const stockMap = {};
for (const row of records) {
  const { Symbol, ...data } = row;
  stockMap[Symbol] = data;
}

// Output JS module
const output = `export const STOCK_FORUMS = ${JSON.stringify(stockMap, null, 2)};\n`;

fs.writeFileSync(path.resolve('src/lib/stockForums.js'), output);
console.log('✅ STOCK_FORUMS generated successfully!');