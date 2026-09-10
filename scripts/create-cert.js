import { access, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const certificatePath = path.join(projectRoot, 'localhost.pem');
const keyPath = path.join(projectRoot, 'localhost-key.pem');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(certificatePath)) || !(await exists(keyPath))) {
  await mkdir(projectRoot, { recursive: true });

  const result = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath,
    '-out', certificatePath,
    '-days', '825',
    '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
  ], { stdio: 'inherit' });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`openssl exited with status ${result.status}`);
  }

  console.log('Generated localhost.pem and localhost-key.pem.');
}
