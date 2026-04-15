'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const APP_FILE = path.join(SRC, 'app.js');
const ROUTES_INDEX = path.join(SRC, 'routes', 'index.js');
const CONTENT_ROUTER_FILE = path.join(SRC, 'modules', 'content-db', 'createContentRouter.js');
const OUT_MD = path.join(ROOT, 'docs', 'API_ENDPOINTS_TABLE.md');
const OUT_CSV = path.join(ROOT, 'docs', 'api_endpoints_table.csv');

const CONTENT_TYPES_COMIC = new Set(['manga', 'manhwa', 'manhua']);
const CONTENT_TYPES_ANIM = new Set(['anime', 'donghua']);

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/');
}

function rel(p) {
  return normalizeSlashes(path.relative(ROOT, p));
}

function joinPath(base, segment) {
  const a = base || '/';
  const b = segment || '/';
  if (b === '/') return a;
  if (a === '/') return b.startsWith('/') ? b : `/${b}`;
  return `${a.replace(/\/$/, '')}/${b.replace(/^\//, '')}`;
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function stripComments(code) {
  const noBlock = code.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock.replace(/^\s*\/\/.*$/gm, '');
}

function resolveRequire(fromFile, reqPath) {
  const base = path.resolve(path.dirname(fromFile), reqPath);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.routes.js`,
    path.join(base, 'index.js'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function parseFile(filePath) {
  const code = stripComments(read(filePath));

  const constReqMap = new Map();
  const reqRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
  let m;
  while ((m = reqRe.exec(code)) !== null) {
    constReqMap.set(m[1], m[2]);
  }

  const methods = [];
  const methodRe = /(router|app)\s*\.\s*(get|post|put|patch|delete|options|head|all)\s*\(\s*['\"]([^'\"]+)['\"]/g;
  while ((m = methodRe.exec(code)) !== null) {
    methods.push({
      owner: m[1],
      method: m[2].toUpperCase(),
      routePath: m[3],
    });
  }

  const mounts = [];
  const mountRe = /(router|app)\s*\.\s*use\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z_$][\w$]*(?:\s*\(\s*['\"][^'\"]+['\"]\s*\))?|require\(\s*['\"][^'\"]+['\"]\s*\))/g;
  while ((m = mountRe.exec(code)) !== null) {
    const owner = m[1];
    const mountPath = m[2];
    const targetExpr = m[3].trim();

    if (targetExpr.startsWith('require(')) {
      const reqMatch = /require\(\s*['\"]([^'\"]+)['\"]\s*\)/.exec(targetExpr);
      if (reqMatch) {
        const resolved = resolveRequire(filePath, reqMatch[1]);
        if (resolved) {
          mounts.push({ owner, mountPath, kind: 'file', target: resolved });
        }
      }
      continue;
    }

    const callMatch = /^([A-Za-z_$][\w$]*)\s*\(\s*['\"]([^'\"]+)['\"]\s*\)$/.exec(targetExpr);
    if (callMatch) {
      const callee = callMatch[1];
      const arg = callMatch[2];
      const calleeReq = constReqMap.get(callee);
      if (calleeReq) {
        const resolved = resolveRequire(filePath, calleeReq);
        if (resolved && path.resolve(resolved) === path.resolve(CONTENT_ROUTER_FILE)) {
          mounts.push({ owner, mountPath, kind: 'content-router', contentType: arg });
          continue;
        }
        if (resolved) {
          mounts.push({ owner, mountPath, kind: 'file', target: resolved });
          continue;
        }
      }
      continue;
    }

    const ident = targetExpr;
    const reqPath = constReqMap.get(ident);
    if (!reqPath) continue;
    const resolved = resolveRequire(filePath, reqPath);
    if (!resolved) continue;
    mounts.push({ owner, mountPath, kind: 'file', target: resolved });
  }

  return { methods, mounts };
}

function contentRouterEndpoints(contentType) {
  const endpoints = [
    { method: 'GET', routePath: '/' },
    { method: 'GET', routePath: '/:slug' },
    { method: 'GET', routePath: '/:id/recommendations' },
    { method: 'POST', routePath: '/' },
    { method: 'PUT', routePath: '/:id' },
    { method: 'DELETE', routePath: '/:id' },
    { method: 'PATCH', routePath: '/:id/rate' },
  ];

  if (CONTENT_TYPES_COMIC.has(contentType)) {
    endpoints.push({ method: 'GET', routePath: '/:id/chapters' });
  }

  if (CONTENT_TYPES_ANIM.has(contentType)) {
    endpoints.push({ method: 'GET', routePath: '/:id/seasons' });
    endpoints.push({ method: 'GET', routePath: '/:id/episodes' });
  }

  return endpoints;
}

function collectEndpoints() {
  const parsedCache = new Map();

  function parsed(filePath) {
    if (!parsedCache.has(filePath)) {
      parsedCache.set(filePath, parseFile(filePath));
    }
    return parsedCache.get(filePath);
  }

  const rows = [];
  const seen = new Set();

  function traverseFile(filePath, prefix, chain) {
    const key = `${filePath}::${prefix}`;
    if (seen.has(key)) return;
    seen.add(key);

    const p = parsed(filePath);

    for (const e of p.methods) {
      rows.push({
        method: e.method,
        fullPath: joinPath(prefix, e.routePath),
        source: rel(filePath),
      });
    }

    for (const mnt of p.mounts) {
      const nextPrefix = joinPath(prefix, mnt.mountPath);
      if (mnt.kind === 'file') {
        traverseFile(mnt.target, nextPrefix, chain.concat([rel(filePath)]));
      } else if (mnt.kind === 'content-router') {
        const local = contentRouterEndpoints(mnt.contentType);
        for (const e of local) {
          rows.push({
            method: e.method,
            fullPath: joinPath(nextPrefix, e.routePath),
            source: `${rel(CONTENT_ROUTER_FILE)}#${mnt.contentType}`,
          });
        }
      }
    }
  }

  // Direct app-level endpoints
  const appParsed = parsed(APP_FILE);
  for (const e of appParsed.methods.filter((x) => x.owner === 'app')) {
    rows.push({ method: e.method, fullPath: e.routePath, source: rel(APP_FILE) });
  }

  // Traverse mounted routers from app.js
  for (const mnt of appParsed.mounts.filter((x) => x.owner === 'app')) {
    if (mnt.kind === 'file') {
      traverseFile(mnt.target, mnt.mountPath, [rel(APP_FILE)]);
    }
  }

  // Ensure index router is covered if mounted symbol resolution changes.
  if (!rows.some((r) => r.source === rel(ROUTES_INDEX))) {
    traverseFile(ROUTES_INDEX, '/api/v1', ['fallback']);
  }

  // Deduplicate exact method+path+source
  const uniq = [];
  const kset = new Set();
  for (const r of rows) {
    const k = `${r.method} ${r.fullPath} ${r.source}`;
    if (!kset.has(k)) {
      kset.add(k);
      uniq.push(r);
    }
  }

  uniq.sort((a, b) => {
    if (a.fullPath === b.fullPath) return a.method.localeCompare(b.method);
    return a.fullPath.localeCompare(b.fullPath);
  });

  return uniq;
}

function toMarkdownTable(rows) {
  const lines = [];
  lines.push('# API Endpoints Table');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Total endpoints: ${rows.length}`);
  lines.push('');
  lines.push('| No | Method | Full Path | Source |');
  lines.push('|---:|:------:|---|---|');
  rows.forEach((r, idx) => {
    lines.push(`| ${idx + 1} | ${r.method} | ${r.fullPath} | ${r.source} |`);
  });
  lines.push('');
  return lines.join('\n');
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const lines = ['No,Method,FullPath,Source'];
  rows.forEach((r, idx) => {
    lines.push([idx + 1, r.method, r.fullPath, r.source].map(csvEscape).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = collectEndpoints();
  fs.writeFileSync(OUT_MD, toMarkdownTable(rows), 'utf8');
  fs.writeFileSync(OUT_CSV, toCsv(rows), 'utf8');

  const byMethod = rows.reduce((acc, r) => {
    acc[r.method] = (acc[r.method] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    total: rows.length,
    byMethod,
    markdown: rel(OUT_MD),
    csv: rel(OUT_CSV),
  }, null, 2));
}

main();
