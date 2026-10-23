/* Reproducible local benchmark. All files are written to disposable OS temporary directories. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === 'electron') return { app: { getPath: () => os.tmpdir(), name: 'Dayleaf benchmark', getVersion: () => '3.4.2' } };
  return originalLoad.call(this, name, ...args);
};
const DiaryService = require('../src/main/services/diaryService').default;
Module._load = originalLoad;
const { createIndex, clearIndex, searchIndex } = require('../src/renderer/utils/searchIndex');
async function run(count, images) {
  global.gc?.();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dayleaf-benchmark-'));
  const entries = {};
  const first = new Date('1990-01-01T12:00:00Z');
  const photo = images ? '![photo](data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024) + ')' : '';
  for (let i = 0; i < count; i++) {
    const date = new Date(first); date.setUTCDate(first.getUTCDate() + i);
    entries[date.toISOString().slice(0, 10)] = { title: '散步记录 ' + i, text: '今天去了公园散步。记录生活与阅读。'.repeat(25) + (i < images ? photo : ''), textFormat: 'markdown', textFormatVersion: 1, dateUpdated: first.toISOString() };
  }
  const diary = new DiaryService(directory);
  try {
    await diary.create('disposable-benchmark');
    let start = performance.now(); await diary.replaceEntries(entries); const initialSaveMs = performance.now() - start;
    const saveMs = [];
    const key = Object.keys(entries)[count - 1];
    for (let i = 0; i < 5; i++) { start = performance.now(); await diary.save({ indexDate: key, entry: { ...entries[key], text: entries[key].text + i } }); saveMs.push(performance.now() - start); }
    start = performance.now(); await createIndex(entries); const indexMs = performance.now() - start;
    start = performance.now(); const results = searchIndex('公园'); const searchMs = performance.now() - start;
    return { entries: count, embeddedImages1MiB: images, encryptedFileMiB: +((await fs.stat(path.join(directory, 'mini-diary.txt'))).size / 1024 / 1024).toFixed(2), initialSaveMs: +initialSaveMs.toFixed(1), saveMedianMs: +saveMs.sort((a,b)=>a-b)[2].toFixed(1), indexMs: +indexMs.toFixed(1), searchMs: +searchMs.toFixed(1), matches: results.length, rssMiB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1) };
  } finally { await diary.lock(); await clearIndex(); await fs.rm(directory, { recursive: true, force: true }); }
}
(async () => { const results = []; for (const [count, images] of [[1000, 0], [10000, 0], [1000, 8]]) results.push(await run(count, images)); console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, results }, null, 2)); })().catch(error => { console.error(error); process.exitCode = 1; });
