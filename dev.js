import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:https';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import './scripts/create-cert.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(projectRoot, 'codes');
const hostname = 'localhost';
const port = 3001;
const watcher = spawn(process.execPath, ['build.js', '--watch'], {
  cwd: projectRoot,
  stdio: 'inherit'
});

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, 'https://localhost').pathname);
  const requestedPath = path.resolve(sourceDir, `.${pathname}`);
  const relativePath = path.relative(sourceDir, requestedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return requestedPath;
}

const server = createServer({
  cert: await readFile(path.join(projectRoot, 'localhost.pem')),
  key: await readFile(path.join(projectRoot, 'localhost-key.pem'))
}, async (request, response) => {
  const filePath = resolveRequestPath(request.url ?? '/');

  if (!filePath) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');

    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8'
    });
    if (result.stdout) console.error(result.stdout.trim());
  } else {
    console.error(error);
  }
  watcher.kill();
  process.exitCode = 1;
});

server.listen(port, hostname, () => {
  console.log(`Serving codes/ at https://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    watcher.kill(signal);
    server.close(() => process.exit(0));
  });
}
