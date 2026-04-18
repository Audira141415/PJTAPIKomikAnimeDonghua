const fs = require('fs');
const path = require('path');

const targetDirs = ['src', 'apps'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const replacements = [
    // 1. Core Utils & Errors
    { pattern: /require\(['"].*shared\/utils\/([^'" ]+)['"]\)/g, replacement: "require('@core/utils/$1')" },
    { pattern: /require\(['"].*shared\/errors\/([^'" ]+)['"]\)/g, replacement: "require('@core/errors/$1')" },
    { pattern: /require\(['"].*shared\/constants\/([^'" ]+)['"]\)/g, replacement: "require('@core/constants/$1')" },
    { pattern: /require\(['"].*shared\/scrapers\/([^'" ]+)['"]\)/g, replacement: "require('@scrapers/$1')" },
    
    // Domain Cross-Requires
    { pattern: /require\(['"].*domains\/catalogs\/([^'" ]+)['"]\)/g, replacement: "require('@catalogs/$1')" },
    { pattern: /require\(['"].*domains\/identity\/([^'" ]+)['"]\)/g, replacement: "require('@identity/$1')" },
    { pattern: /require\(['"].*domains\/interactions\/([^'" ]+)['"]\)/g, replacement: "require('@interactions/$1')" },
    { pattern: /require\(['"].*domains\/metrics\/([^'" ]+)['"]\)/g, replacement: "require('@metrics/$1')" },
    
    // 2. Configs
    { pattern: /require\(['"].*config\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\/logger['"]\)/g, replacement: "require('@core/utils/logger')" },
    { pattern: /require\(['"]\.\/db['"]\)/g, replacement: "require('@core/database/db')" },
    { pattern: /require\(['"]\.\/redis['"]\)/g, replacement: "require('@core/database/redis')" },
    { pattern: /require\(['"]\.\/context['"]\)/g, replacement: "require('@core/config/context')" },
    { pattern: /require\(['"].*config\/logger['"]\)/g, replacement: "require('@core/utils/logger')" },
    { pattern: /require\(['"].*config\/mailer['"]\)/g, replacement: "require('@core/utils/mailer')" },
    { pattern: /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/([^'" ]+)['"]\)/g, replacement: "require('@core/utils/$1')" },
    { pattern: /require\(['"]\.\.\/\.\.\/\.\.\/utils\/([^'" ]+)['"]\)/g, replacement: "require('@core/utils/$1')" },
    { pattern: /require\(['"]\.\.\/\.\.\/utils\/([^'" ]+)['"]\)/g, replacement: "require('@core/utils/$1')" },
    { pattern: /require\(['"]\.\.\/utils\/([^'" ]+)['"]\)/g, replacement: "require('@core/utils/$1')" },
    { pattern: /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/config\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\.\/\.\.\/\.\.\/config\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\.\/\.\.\/config\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\.\/config\/env['"]\)/g, replacement: "require('@core/config/env')" },
    { pattern: /require\(['"]\.\.\/config\/redis['"]\)/g, replacement: "require('@core/database/redis')" },
    { pattern: /require\(['"]\.\.\/\.\.\/config\/redis['"]\)/g, replacement: "require('@core/database/redis')" },
    { pattern: /require\(['"].*config\/swagger['"]\)/g, replacement: "require('@core/config/swagger')" },
    { pattern: /require\(['"].*config\/context['"]\)/g, replacement: "require('@core/config/context')" },
    
    // 3. Models Registry (Centralized)
    { pattern: /const\s+\{?([A-Za-z0-9_,\s]+)\}?\s*=\s*require\(['"].*models(\/index)?['"]\);?/g, replacement: "const { $1 } = require('@models');" },
    { pattern: /const\s+([A-Za-z0-9_]+)\s*=\s*require\(['"].*models\/([^'\" ]+)['"]\);?/g, replacement: "const { $1 } = require('@models');" },

    // 4. Middlewares
    { pattern: /require\(['"].*middlewares\/([^'" ]+)['"]\)/g, replacement: "require('@middlewares/$1')" },
    { pattern: /require\(['"].*auth\/auth.middleware['"]\)/g, replacement: "require('@auth/auth.middleware')" },
    { pattern: /require\(['"].*auth.middleware['"]\)/g, replacement: "require('@auth/auth.middleware')" },

    // 5. Centralized Repositories
    { pattern: /const\s+([A-Za-z0-9_]+)\s*=\s*require\(['"].*repositories\/([^'\" ]+?)(\.repository)?['"]\);?/g, replacement: (match, p1, p2) => `const { ${p2.replace(/\./g, '')}Repository: ${p1} } = require('@repositories');` },
    { pattern: /const\s+([A-Za-z0-9_]+)\s*=\s*require\(['"]\.\/([^'\" ]+?)\.repository['"]\);?/g, replacement: (match, p1, p2) => `const { ${p2.replace(/\./g, '')}Repository: ${p1} } = require('@repositories');` },
    
    // 6. Local Repositories fallback (if any left)
    { pattern: /require\(['"].*repositories\/([^'" ]+)['"]\)/g, replacement: "require('@repositories')" },
];

targetDirs.forEach(root => {
    if (!fs.existsSync(root)) return;
    const files = walk(root);
    files.forEach(file => {
        if (file.includes('modelRegistry.js')) return;
        if (file.includes('repositoryRegistry.js')) return;
        let content = fs.readFileSync(file, 'utf8');
        let changed = false;
        
        replacements.forEach(r => {
            if (r.pattern.test(content)) {
                content = content.replace(r.pattern, r.replacement);
                changed = true;
            }
        });
        
        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Refactored: ${file}`);
        }
    });
});
