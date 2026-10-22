const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readReviews } = require('./review.ts');

test('simultaneous review decisions preserve every entry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pigxel-reviews-'));
  const file = path.join(dir, 'review.json');
  const modulePath = path.join(__dirname, 'review.ts');
  const script = `const {updateReviews}=require(process.argv[1]);updateReviews(r=>{r[process.argv[3]]={status:'approved',note:'',hash:'test',at:'test'}},process.argv[2])`;
  try {
    await Promise.all(Array.from({ length: 12 }, (_, index) => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', script, modulePath, file, `test/${index}`], { stdio: ['ignore', 'ignore', 'pipe'] });
      let error = '';
      child.stderr.on('data', (chunk) => { error += chunk; });
      child.on('error', reject);
      child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(error || `Exit ${code}`)));
    })));
    assert.equal(Object.keys(readReviews(file)).length, 12);
    assert.equal(fs.existsSync(`${file}.lock`), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
