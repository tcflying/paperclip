const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '192.168.50.233', port: 3100, path }, (res) => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname: '192.168.50.233', port: 3100, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let d = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d, cookies }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Login on 192.168.50.233
  const login = await post('/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  console.log('Login:', login.status);
  const cookies = login.cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookies:', cookies.length > 0 ? 'got' : 'none');

  function apiGet(path, c) {
    return new Promise((resolve, reject) => {
      const req = http.get({ hostname: '192.168.50.233', port: 3100, path, headers: { Cookie: c } }, (res) => {
        let d = '';
        res.on('data', chunk => { d += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      });
      req.on('error', reject);
    });
  }

  const companiesRes = await apiGet('/api/companies', cookies);
  console.log('Companies:', companiesRes.status, companiesRes.body.substring(0, 200));

  const companies = JSON.parse(companiesRes.body);
  const utfaa = companies.find(c => c.name === 'UTFAA' || (c.prefix || c.slug) === 'UTFAA');
  console.log('UTFAA:', utfaa);
  if (!utfaa) {
    console.log('UTFAA not found');
    process.exit(0);
  }

  // Get heartbeat runs
  const runsRes = await apiGet('/api/companies/' + utfaa.id + '/heartbeat-runs?limit=3', cookies);
  const runs = JSON.parse(runsRes.body).items || [];
  console.log('Runs:', runs.length, runs.map(r => r.status).join(', '));

  const active = runs.filter(r => r.status !== 'completed');
  if (active.length === 0) {
    console.log('No active runs');
    process.exit(0);
  }

  const run = active[0];
  console.log('Run:', run.id.slice(0, 8), run.status);

  const logRes = await apiGet('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=65536', cookies);
  const log = JSON.parse(logRes.body);
  const entries = log.entries || [];
  console.log('Entries:', entries.length);

  for (const e of entries.slice(-20)) {
    if (e.chunk && e.chunk.length > 5) {
      const garbled = /[褰鈥睍]/.test(e.chunk);
      const chinese = /[\u4e00-\u9fff]/.test(e.chunk);
      console.log('[' + (e.stream || '?') + '] garbled=' + garbled + ' chinese=' + chinese + ' len=' + e.chunk.length);
      console.log('  "' + e.chunk.substring(0, 200) + '"');
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
