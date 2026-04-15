'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'docs', 'api_endpoints_table.csv');
const REPORT_PATH = path.join(ROOT, 'docs', 'OPENAPI_GAP_REPORT.md');

function normalizePath(p) {
  const cleaned = (p || '').trim();
  if (!cleaned) return '/';
  const swapped = cleaned.replace(/\{([^}]+)\}/g, ':$1');
  const squashed = swapped.replace(/\/+/g, '/');
  const noTrailing = squashed.length > 1 ? squashed.replace(/\/$/, '') : squashed;
  return noTrailing || '/';
}

function csvParse(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const cols = [];
    let cur = '';
    let inQ = false;

    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j + 1] === '"') {
          cur += '"';
          j += 1;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);

    rows.push({
      no: Number(cols[0]),
      method: (cols[1] || '').trim().toUpperCase(),
      fullPath: normalizePath(cols[2] || ''),
      source: (cols[3] || '').trim(),
    });
  }
  return rows;
}

function loadCodeEndpoints() {
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = csvParse(csv);
  const set = new Set(rows.map((r) => `${r.method} ${r.fullPath}`));
  return { rows, set };
}

function loadSpecEndpoints(codeSet) {
  const swaggerSpec = require(path.join(ROOT, 'src', 'config', 'swagger.js')).swaggerSpec;
  const paths = swaggerSpec.paths || {};

  const rows = [];
  const set = new Set();
  const validMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'ALL']);

  for (const rawPath of Object.keys(paths)) {
    const ops = paths[rawPath] || {};
    for (const method of Object.keys(ops)) {
      const upper = method.toUpperCase();
      if (!validMethods.has(upper)) continue;

      const normalized = normalizePath(rawPath);
      const prefixed = normalized.startsWith('/api/v1')
        ? normalized
        : normalizePath(`/api/v1${normalized}`);

      // Choose the path variant that actually exists in implementation when possible.
      let chosenPaths;
      const rawKey = `${upper} ${normalized}`;
      const prefixedKey = `${upper} ${prefixed}`;
      if (codeSet.has(rawKey)) {
        chosenPaths = [normalized];
      } else if (codeSet.has(prefixedKey)) {
        chosenPaths = [prefixed];
      } else if (normalized === '/health') {
        chosenPaths = ['/health'];
      } else {
        chosenPaths = [prefixed];
      }

      for (const fullPath of chosenPaths) {
        const key = `${upper} ${fullPath}`;
        if (!set.has(key)) {
          set.add(key);
          rows.push({ method: upper, fullPath, rawPath });
        }
      }
    }
  }

  return { rows, set };
}

function sortKeys(arr) {
  return arr.slice().sort((a, b) => {
    const [ma, ...pa] = a.split(' ');
    const [mb, ...pb] = b.split(' ');
    const pA = pa.join(' ');
    const pB = pb.join(' ');
    if (pA === pB) return ma.localeCompare(mb);
    return pA.localeCompare(pB);
  });
}

function pickCriticalMissing(implementedNotInSpec) {
  const criticalGroups = [
    { name: 'Auth', prefixes: ['/api/v1/auth'] },
    { name: 'Users', prefixes: ['/api/v1/users'] },
    { name: 'Series Core', prefixes: ['/api/v1/mangas', '/api/v1/manga-db', '/api/v1/manhwa-db', '/api/v1/manhua-db', '/api/v1/anime-db', '/api/v1/donghua-db'] },
    { name: 'Interaction Core', prefixes: ['/api/v1/comments', '/api/v1/reviews', '/api/v1/tags', '/api/v1/collections'] },
    { name: 'Ops/Health', prefixes: ['/health', '/api/v1/jobs'] },
  ];

  const grouped = [];
  for (const group of criticalGroups) {
    const items = implementedNotInSpec.filter((k) => {
      const pathPart = k.split(' ').slice(1).join(' ');
      return group.prefixes.some((p) => pathPart.startsWith(p));
    });
    if (items.length > 0) {
      grouped.push({ name: group.name, count: items.length, items: sortKeys(items).slice(0, 25) });
    }
  }
  return grouped;
}

function buildReport(payload) {
  const {
    codeTotal,
    specTotal,
    implementedNotInSpec,
    specNotInCode,
    criticalGroups,
  } = payload;

  const lines = [];
  lines.push('# OpenAPI Gap Report');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Implemented endpoints (code): ${codeTotal}`);
  lines.push(`- Documented endpoints (OpenAPI): ${specTotal}`);
  lines.push(`- In code but missing in spec: ${implementedNotInSpec.length}`);
  lines.push(`- In spec but not implemented: ${specNotInCode.length}`);
  lines.push('');

  lines.push('## Critical Priority (Document First)');
  lines.push('');
  if (criticalGroups.length === 0) {
    lines.push('- No critical missing groups detected with current prefix rules.');
  } else {
    for (const g of criticalGroups) {
      lines.push(`### ${g.name} (${g.count})`);
      lines.push('');
      g.items.forEach((i) => lines.push(`- ${i}`));
      lines.push('');
    }
  }

  lines.push('## Gap A: Implemented but Missing in OpenAPI');
  lines.push('');
  sortKeys(implementedNotInSpec).forEach((k) => lines.push(`- ${k}`));
  lines.push('');

  lines.push('## Gap B: In OpenAPI but Not Implemented');
  lines.push('');
  sortKeys(specNotInCode).forEach((k) => lines.push(`- ${k}`));
  lines.push('');

  lines.push('## Recommended Next Steps');
  lines.push('');
  lines.push('1. Add Auth, Users, and Series Core gaps into OpenAPI first (client-facing critical paths).');
  lines.push('2. Add Interaction Core (comments/reviews/tags/collections) next.');
  lines.push('3. Decide whether scraper/source endpoints are public-contract or internal, then include/exclude explicitly in spec.');
  lines.push('4. Add CI check: fail build when endpoint delta between code and spec exceeds threshold.');
  lines.push('');

  return lines.join('\n');
}

function main() {
  const code = loadCodeEndpoints();
  const spec = loadSpecEndpoints(code.set);

  const implementedNotInSpec = [...code.set].filter((k) => !spec.set.has(k));
  const specNotInCode = [...spec.set].filter((k) => !code.set.has(k));

  const criticalGroups = pickCriticalMissing(implementedNotInSpec);

  const report = buildReport({
    codeTotal: code.set.size,
    specTotal: spec.set.size,
    implementedNotInSpec,
    specNotInCode,
    criticalGroups,
  });

  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  console.log(JSON.stringify({
    reportPath: 'docs/OPENAPI_GAP_REPORT.md',
    codeTotal: code.set.size,
    specTotal: spec.set.size,
    implementedNotInSpec: implementedNotInSpec.length,
    specNotInCode: specNotInCode.length,
    criticalGroups: criticalGroups.map((g) => ({ name: g.name, count: g.count })),
  }, null, 2));
}

main();
