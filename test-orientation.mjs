import { chromium } from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = '/home/hatch/workspace/projects/makefun/work/turkey-game/repo-orient';
const base = 'http://127.0.0.1:8901';
const out = '/tmp/gobble-run-orientation';
const server = spawn(process.execPath, ['serve.ts', '--port', '8901'], { cwd: root, stdio: 'ignore' });
const errors = [], external = [], shots = {}, checks = [];
let browser;
const pass = (name, detail = '') => { checks.push({ name, status: 'PASS', detail }); console.log('PASS', name, detail); };
const fail = (name, detail) => { checks.push({ name, status: 'FAIL', detail }); };

try {
  await mkdir(out, { recursive: true });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'server did not start on port 8901');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  context.on('request', request => {
    if (!request.url().startsWith(`${base}/`) && !request.url().startsWith('data:')) external.push(request.url());
  });
  await context.route('**/src/main.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.__testRenderer=renderer;` });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  for (const name of ['start', 'play', 'chase', 'end']) {
    const hashes = [];
    for (let repeat = 0; repeat < 2; repeat++) {
      await page.goto(`${base}/?shot=${name}&seed=1`);
      await page.waitForFunction(() => window.__shotReady, { timeout: 30000 });
      assert.equal(await page.evaluate(() => window.__renderer3d), true, `${name} must use 3D`);
      const file = `${out}/${name}${repeat ? '-repeat' : ''}.png`;
      const image = await page.screenshot({ path: file });
      hashes.push(createHash('sha256').update(image).digest('hex'));
      if (!repeat) shots[name] = await page.evaluate(() => {
        const w = window.__game.world, r = window.__testRenderer;
        return { zone: w.zone, x: w.x, birdYaw: r.bird.rotation.y, birdX: r.bird.position.x, farmerYaw: r.chaser.rotation.y, farmerX: r.chaser.position.x, birdZ: r.bird.position.z, farmerZ: r.chaser.position.z };
      });
    }
    assert.equal(hashes[0], hashes[1], `${name} shot must be deterministic`);
    pass(`Deterministic ?shot=${name}`, hashes[0]);
  }
  for (const name of ['play', 'chase']) {
    assert(Math.abs(shots[name].birdYaw - Math.PI) < .05, `${name}: turkey yaw ${shots[name].birdYaw}`);
    assert(Math.abs(shots[name].farmerYaw - Math.PI) < .05, `${name}: farmer yaw ${shots[name].farmerYaw}`);
    assert(shots[name].farmerZ > shots[name].birdZ, `${name}: farmer must stay behind turkey`);
    assert(Math.abs(shots[name].farmerX - shots[name].birdX) < .5, `${name}: farmer must stay in same lane vicinity`);
  }
  pass('Play/chase shots face -z with farmer following behind', JSON.stringify({ play: shots.play, chase: shots.chase }));

  await page.goto(`${base}/?shot=play&seed=1`);
  await page.waitForFunction(() => window.__shotReady);
  const zonePose = await page.evaluate(() => {
    const w = window.__game.world, r = window.__testRenderer, lanes = [-2.8, 0, 2.8];
    return [0, 1, 2].map(zone => {
      w.zone = zone; w.distance = zone * 500 + 80; w.x = w.targetX = lanes[zone]; w.y = zone === 2 ? 2.4 : 0; w.dashTime = zone === 1 ? .8 : 0;
      r.render(w, 10);
      return { zone, lane: lanes[zone], x: r.bird.position.x, birdYaw: r.bird.rotation.y, farmerYaw: r.chaser.rotation.y, farmerX: r.chaser.position.x, birdZ: r.bird.position.z, farmerZ: r.chaser.position.z };
    });
  });
  for (const pose of zonePose) {
    assert(Math.abs(pose.birdYaw - Math.PI) < .05, `zone ${pose.zone}: turkey yaw ${pose.birdYaw}`);
    assert(Math.abs(pose.farmerYaw - Math.PI) < .05, `zone ${pose.zone}: farmer yaw ${pose.farmerYaw}`);
    assert(Math.abs(pose.x - pose.lane) < .001, `zone ${pose.zone}: x ${pose.x}`);
    assert(Math.abs(pose.farmerX - pose.lane) < .5, `zone ${pose.zone}: farmer x ${pose.farmerX}`);
    assert(pose.farmerZ > pose.birdZ, `zone ${pose.zone}: farmer z ${pose.farmerZ}`);
  }
  pass('Straight running pose in all three zones, including jump/dash state', JSON.stringify(zonePose));

  await page.goto(base);
  await page.waitForFunction(() => window.__game);
  await page.evaluate(() => { window.__game.start(); window.__game.world.entities = []; window.__game.world.invulnerable = 1000; });
  const lane = async expected => {
    await page.waitForFunction(x => Math.abs(window.__game.world.x - x) < .05, expected, { timeout: 5000 });
    const actual = await page.evaluate(() => ({ x: window.__game.world.x, targetX: window.__game.world.targetX }));
    assert.equal(actual.targetX, expected, `target ${actual.targetX} must equal lane ${expected}`);
    assert(Math.abs(actual.x - expected) < .05, `settled x ${actual.x} must equal lane ${expected}`);
    return actual;
  };
  await page.keyboard.press('ArrowLeft');
  await lane(-2.8);
  await page.keyboard.press('ArrowRight');
  await lane(0);
  await page.keyboard.press('ArrowRight');
  await lane(2.8);
  await page.mouse.move(950, 360);
  await page.mouse.down();
  await page.mouse.move(650, 360, { steps: 8 });
  await page.mouse.up();
  const dragged = await lane(0);
  await page.keyboard.press('ArrowLeft');
  await lane(-2.8);
  pass('Keyboard and mouse drag settle exactly on LANES', JSON.stringify({ left: -2.8, center: dragged, right: 2.8 }));
  const epsilon = await page.evaluate(() => {
    const w = window.__game.world; w.x = -2.785; w.targetX = -2.8; w.update(1 / 60); return { x: w.x, targetX: w.targetX };
  });
  assert.equal(epsilon.x, -2.8, 'near-lane drift must snap exactly');
  pass('Sub-epsilon lane drift snaps to target', JSON.stringify(epsilon));

  await page.evaluate(() => { window.__game.start(); window.__game.world.invulnerable = 1000; });
  await page.waitForTimeout(2000);
  const perf = await page.evaluate(() => new Promise(resolve => {
    const times = []; let start, last;
    const sample = now => {
      if (!start) { start = last = now; requestAnimationFrame(sample); return; }
      times.push(now - last); last = now;
      if (now - start < 10000) { requestAnimationFrame(sample); return; }
      const sorted = [...times].sort((a, b) => a - b);
      resolve({ frames: times.length, durationMs: now - start, fps: times.length * 1000 / (now - start), p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1), over100: times.filter(x => x > 100).length, gpu: window.__gpu, stats: window.__renderStats });
    };
    requestAnimationFrame(sample);
  }));
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(external.length, 0, external.join('\n'));
  pass('Console errors', '0');
  pass('External network requests', '0');
  const report = { shots, zonePose, perf, errors, external, checks };
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  console.log('PERFORMANCE', JSON.stringify(perf));
  console.log('SCREENSHOTS', out);
} catch (error) {
  fail('Verification failure', error.stack);
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await new Promise(resolve => server.once('exit', resolve));
}
