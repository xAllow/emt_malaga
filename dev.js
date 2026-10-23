// Servidor de desarrollo sin Vercel: sirve /public y monta las funciones de /api. Uso: node dev.js
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    const f = path.join(__dirname, 'api', path.basename(u.pathname) + '.js');
    if (!fs.existsSync(f) || path.basename(f).startsWith('_')) { res.statusCode = 404; return res.end(); }
    req.query = Object.fromEntries(u.searchParams);
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return require(f)(req, res);
  }
  const pub = path.join(__dirname, 'public');
  const f = path.join(pub, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!f.startsWith(pub) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('no'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(8081, () => console.log('http://localhost:8081'));
