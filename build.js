import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(projectRoot, 'codes');
const outputDir = path.join(projectRoot, 'dist');
const watchMode = process.argv.includes('--watch');

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findJavaScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  }));

  return files.flat();
}

/**
 * Wipe dist before every build. esbuild only overwrites files it emits, so a
 * source file that gets renamed or deleted leaves its old bundle behind --
 * and those stale bundles still ship via jsDelivr.
 */
async function cleanOutputDir() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, '.gitkeep'), '');
}

export async function buildProject() {
  await cleanOutputDir();
  const entryPoints = await findJavaScriptFiles(sourceDir);

  if (entryPoints.length === 0) {
    console.log('No JavaScript entry points found under codes/.');
    return;
  }

  await build({
    entryPoints,
    outbase: sourceDir,
    outdir: outputDir,
    bundle: true,
    minify: true,
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'info'
  });
}

async function main() {
  await buildProject();

  if (!watchMode) return;

  console.log('Watching codes/ for changes...');
  let timer;
  let building = false;
  let queued = false;

  const rebuild = async () => {
    if (building) {
      queued = true;
      return;
    }

    building = true;
    try {
      await buildProject();
    } catch (error) {
      console.error(error);
    } finally {
      building = false;
      if (queued) {
        queued = false;
        await rebuild();
      }
    }
  };

  watch(sourceDir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 75);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
