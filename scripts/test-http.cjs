for (const key of [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'RESUME_ADMIN_PASSWORD',
  'RESUME_ADMIN_USERNAME',
  'VERCEL',
])
  process.env[key] = '';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const folder = mkdtempSync(path.join(tmpdir(), 'resume-http-test-'));
process.env.RESUME_DB_PATH = path.join(folder, 'test.sqlite');
const store = require('../server/store.cjs');
const origin = 'http://localhost:3109';
let server;
async function send(
  route,
  method = 'GET',
  body,
  cookie,
  requestOrigin = origin,
) {
  return fetch(origin + route, {
    method,
    redirect: 'manual',
    headers: {
      ...(body !== undefined
        ? { 'Content-Type': 'application/json', Origin: requestOrigin }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
(async () => {
  try {
    await store.createAdmin('integration-admin', 'integration-password-123');
    server = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', '3109'],
      {
        env: { ...process.env, APP_ORIGIN: origin },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    let logs = '';
    server.stdout.on('data', (x) => (logs += x));
    server.stderr.on('data', (x) => (logs += x));
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await send('/')).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'Production server did not start: ' + logs);
    assert.equal((await send('/api/admin/resume')).status, 401);
    const loggedOutPage = await (await send('/admin')).text();
    assert.ok(loggedOutPage.includes('登录数据管理'));
    assert.ok(!loggedOutPage.includes('CEC GienTech'));
    assert.equal((await send('/api/admin/resume', 'PUT', {})).status, 401);
    assert.equal(
      (
        await send(
          '/api/admin/login',
          'POST',
          {
            username: 'integration-admin',
            password: 'integration-password-123',
          },
          undefined,
          'https://evil.example',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await send('/api/admin/login', 'POST', {
          username: 'integration-admin',
          password: 'wrong',
        })
      ).status,
      401,
    );
    const login = await send('/api/admin/login', 'POST', {
      username: 'integration-admin',
      password: 'integration-password-123',
    });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=strict/i);
    const cookie = setCookie.split(';')[0];
    const initial = await (
      await send('/api/admin/resume', 'GET', undefined, cookie)
    ).json();
    const draft = structuredClone(initial);
    draft.contacts.location = 'Integration test location';
    draft.contacts.linkedin = 'https://www.linkedin.com/in/test';
    draft.contacts.whatsapp = 'https://wa.me/123456789';
    draft.contacts.telegram = 'https://t.me/test';
    draft.roles[0].company = 'Integration Company';
    draft.skills[0].level = 42;
    const savedResponse = await send('/api/admin/resume', 'PUT', draft, cookie);
    assert.equal(savedResponse.status, 200);
    const saved = await savedResponse.json();
    assert.equal(saved.skills[0].level, 42);
    const publicPage = await (await send('/')).text();
    assert.ok(publicPage.includes('Integration Company'));
    assert.ok(publicPage.includes('Integration test location'));
    assert.ok(publicPage.includes('https://t.me/test'));
    assert.ok(publicPage.includes('https://www.linkedin.com/in/test'));
    assert.ok(publicPage.includes('https://wa.me/123456789'));
    const persisted = await (
      await send('/api/admin/resume', 'GET', undefined, cookie)
    ).json();
    assert.deepEqual(persisted.contacts, draft.contacts);
    assert.ok(publicPage.includes('Click me'));
    assert.equal(
      (await send('/api/admin/resume', 'PUT', initial, cookie)).status,
      409,
    );
    assert.equal(
      (
        await send(
          '/api/admin/resume',
          'PUT',
          {
            ...saved,
            contacts: { ...saved.contacts, linkedin: 'javascript:alert(1)' },
          },
          cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await send(
          '/api/admin/resume',
          'PUT',
          saved,
          cookie,
          'https://evil.example',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await send(
          '/api/admin/password',
          'POST',
          { current: 'integration-password-123', next: 'changed-password-456' },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (await send('/api/admin/resume', 'GET', undefined, cookie)).status,
      401,
    );
    const relogin = await send('/api/admin/login', 'POST', {
      username: 'integration-admin',
      password: 'changed-password-456',
    });
    assert.equal(relogin.status, 200);
    const fresh = relogin.headers.get('set-cookie').split(';')[0];
    assert.equal(
      (await send('/api/admin/logout', 'POST', {}, fresh)).status,
      200,
    );
    assert.equal(
      (await send('/api/admin/resume', 'GET', undefined, fresh)).status,
      401,
    );
    console.log(
      'PASS: production HTTP integration — authentication, CSRF, session cookies, CRUD persistence, public rendering, validation, revision conflict, password change and logout.',
    );
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await new Promise((resolve) => server.once('exit', resolve));
    }
    store.db().close();
    rmSync(folder, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
