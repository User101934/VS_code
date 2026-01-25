import React, { useMemo } from 'react';

export default function WebPreview({ fileName, content, files }) {
    const fullHtml = useMemo(() => {
        // 1. Flatten VFS
        const vfs = {};
        const flatten = (items, path = "") => {
            items.forEach(item => {
                const fullPath = path ? `${path}/${item.name}` : item.name;
                if (item.isDir) {
                    if (item.children) flatten(item.children, fullPath);
                } else {
                    vfs[fullPath] = item.content || "";
                }
            });
        };
        flatten(files);

        // 2. Detect Framework
        const hasVue = Object.keys(vfs).some(f => f.endsWith('.vue'));
        const hasSvelte = Object.keys(vfs).some(f => f.endsWith('.svelte'));
        const isReact = Object.keys(vfs).some(f => f.endsWith('.jsx') || f.match(/import\s+React/));

        // 3. Discover third-party dependencies
        const thirdPartyDeps = new Set();
        Object.values(vfs).forEach(code => {
            if (typeof code !== 'string') return;
            const matches = code.matchAll(/import\s+.*?from\s+['"]([^./][^'"]*)['"]/g);
            for (const match of matches) {
                const dep = match[1];
                if (!['react', 'react-dom', 'react-dom/client', 'lucide-react', 'framer-motion', 'axios', 'vue', 'svelte'].includes(dep)) {
                    thirdPartyDeps.add(dep);
                }
            }
        });

        // 4. Bundler Script
        const escapeScriptTags = (str) => str.replace(/<\/script>/g, '<\\/script>');

        const bundlerScript = `
            (function() {
                window.__VFS__ = ${escapeScriptTags(JSON.stringify(vfs))};
                window.__CACHE__ = {};
                window.__EXTERNAL_DEPS__ = {};
                
                function log(m) { console.log("[Bundler]", m); }
                
                function showError(msg) {
                    const div = document.createElement('div');
                    div.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#1e1e1e;color:#f14c4c;padding:30px;font-family:monospace;white-space:pre-wrap;z-index:99999;font-size:14px;overflow:auto;';
                    div.innerHTML = '<h2 style="color:#f14c4c;margin-top:0;">Runtime Error</h2>' + msg;
                    document.body.appendChild(div);
                }

                function resolve(path) {
                    let clean = path.replace(/^\\.\\//, "").replace(/^\\//, "");
                    const tryPaths = [
                        clean, clean + ".jsx", clean + ".js", clean + ".vue", clean + ".svelte",
                        "src/" + clean, "src/" + clean + ".jsx", "src/" + clean + ".js", "src/" + clean + ".vue"
                    ];
                    return tryPaths.find(p => window.__VFS__[p] !== undefined);
                }

                function require(path) {
                    if (path === 'react') return window.React;
                    if (path === 'react-dom' || path === 'react-dom/client') return window.ReactDOM;
                    if (path === 'vue') return window.Vue;
                    if (path === 'lucide-react') return window.lucide;
                    if (path === 'axios') return window.axios;
                    
                    if (window.__EXTERNAL_DEPS__[path]) return window.__EXTERNAL_DEPS__[path];
                    if (path.endsWith('.css')) return {};

                    const resolved = resolve(path);
                    if (!resolved) throw new Error("Module not found: " + path);
                    if (window.__CACHE__[resolved]) return window.__CACHE__[resolved];

                    const code = window.__VFS__[resolved];
                    const module = { exports: {} };
                    
                    try {
                        let finalCode = "";
                        if (resolved.endsWith('.vue')) {
                            // Basic Vue SFC support (requires global Vue + compiler)
                            // For now, assume composition API in JS if logic is there
                            throw new Error("SFC (.vue) compilation requires backend support or heavy browser compilers. Use JSX or Setup API in .js for now.");
                        } else {
                            const transformed = Babel.transform(code, {
                                presets: ['react', 'env'],
                                filename: resolved
                            }).code;

                            finalCode = transformed
                                .replace(/export\\s+default\\s+/g, 'module.exports.default = module.exports = ')
                                .replace(/export\\s+const\\s+([a-zA-Z0-9_$]+)/g, 'module.exports.$1 = ')
                                .replace(/import\\s+(.*?)\\s+from\\s+['"](.*?)['"];?/g, (match, imports, from) => {
                                     const imps = imports.trim().includes('{') ? imports : ('{ default: ' + imports + ' }');
                                     return 'const ' + imps + ' = require("' + from + '");';
                                })
                                .replace(/import\\s+['"](.*?)['"];?/g, 'require("$1");');
                        }

                        const fn = new Function('require', 'module', 'exports', 'React', 'ReactDOM', 'Vue', finalCode);
                        fn(require, module, module.exports, window.React, window.ReactDOM, window.Vue);
                        
                        window.__CACHE__[resolved] = module.exports.default || module.exports;
                        return window.__CACHE__[resolved];
                    } catch (e) {
                        showError("Error in " + resolved + ":\\n" + e.message);
                        throw e;
                    }
                }

                async function boot() {
                    log("Starting application...");
                    const status = document.getElementById('ide-status');
                    try {
                        let attempts = 0;
                        while(window.__PENDING_DEPS__ > 0 && attempts < 100) {
                            await new Promise(r => setTimeout(r, 100));
                            attempts++;
                        }

                        const entries = ['src/main.jsx', 'src/main.js', 'main.jsx', 'main.js', 'src/App.jsx', 'App.jsx', 'src/index.js', 'index.js'];
                        const entry = entries.find(p => window.__VFS__[p]);
                        if (entry) {
                            require(entry);
                            if (status) {
                                status.style.opacity = '0';
                                setTimeout(() => status.style.display = 'none', 300);
                            }
                        }
                    } catch (err) {
                        showError(err.stack || err.message);
                    }
                }

                window.addEventListener('load', boot);
            })();
        `;

        // 5. HTML Construction
        let htmlTemplate = vfs['index.html'] || vfs['public/index.html'] || vfs['src/index.html'] ||
            '<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div><div id="app"></div></body></html>';

        htmlTemplate = htmlTemplate.replace(/<script\s+[^>]*src=["'](.*?)["'][^>]*><\/script>/gi, (match, src) => {
            const clean = src.replace(/^\.?\//, "");
            return (vfs[clean] || vfs['src/' + clean]) ? `<!-- Stripped: ${src} -->` : match;
        });

        // Core Dependencies
        let deps = `
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
        `;

        if (hasVue) deps += `<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>`;

        deps += `<script>window.__PENDING_DEPS__ = ${thirdPartyDeps.size}; window.__EXTERNAL_DEPS__ = {};</script>`;
        deps += Array.from(thirdPartyDeps).map(dep => `
            <script type="module">
                import * as mod from 'https://esm.sh/${dep}';
                window.__EXTERNAL_DEPS__['${dep}'] = mod;
                window.__PENDING_DEPS__--;
            </script>
        `).join('');

        const cssFiles = Object.keys(vfs).filter(f => f.endsWith('.css'));
        const styles = cssFiles.map(f => `<style id="${f}">\n${vfs[f]}\n</style>`).join('\n');

        let finalHtml = htmlTemplate;
        const statusOverlay = '<div id="ide-status" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#1e1e1e;color:#888;display:flex;align-items:center;justify-content:center;font-family:sans-serif;z-index:99998;transition: opacity 0.3s;pointer-events:none;">Bundling application...</div>';

        if (finalHtml.includes('<head>')) {
            finalHtml = finalHtml.replace('<head>', '<head>' + deps + styles);
        } else {
            finalHtml = deps + styles + finalHtml;
        }

        if (finalHtml.includes('<body>')) {
            finalHtml = finalHtml.replace('<body>', '<body>' + statusOverlay);
        } else {
            finalHtml = statusOverlay + finalHtml;
        }

        const injector = `<script>${bundlerScript}</script>`;
        if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', injector + '</body>');
        } else {
            finalHtml += injector;
        }

        return finalHtml;
    }, [content, fileName, files]);

    return (
        <div style={{ width: '100%', height: '100%', background: 'white', overflow: 'hidden' }}>
            <iframe
                srcDoc={fullHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Web Preview"
                sandbox="allow-scripts"
            />
        </div>
    );
}
