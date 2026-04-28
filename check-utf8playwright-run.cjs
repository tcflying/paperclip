var http = require('http');

function post(path, body) {
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request({ hostname: '192.168.50.233', port: 3100, path: path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, function(res) {
      var d = '';
      var cookies = res.headers['set-cookie'] || [];
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d, cookies: cookies }); });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookies) {
  return new Promise(function(resolve, reject) {
    var req = http.get({ hostname: '192.168.50.233', port: 3100, path: path, headers: { Cookie: cookies } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, body: d }); });
    });
    req.on('error', reject);
  });
}

async function main() {
  var login = await post('/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  console.log('Login:', login.status);
  var cookies = (login.cookies || []).map(function(c) { return c.split(';')[0]; }).join('; ');

  // UTF8Playwright company id: ec1f5d6b
  var companyId = 'ec1f5d6b-6442-4c94-a494-df028da1616d';
  var runsRes = await get('/api/companies/' + companyId + '/heartbeat-runs?limit=5', cookies);
  var runs = JSON.parse(runsRes.body).items || [];
  console.log('Heartbeat runs:', runs.length);
  for (var i = 0; i < runs.length; i++) {
    console.log('  Run[' + i + ']:', runs[i].id.slice(0, 8), 'status=' + runs[i].status);
  }

  var active = runs.filter(function(r) { return r.status !== 'completed'; });
  console.log('Active runs:', active.length);

  if (active.length === 0) {
    console.log('No active runs. Checking latest run...');
    var latest = runs[runs.length - 1];
    if (latest) {
      var logRes = await get('/api/heartbeat-runs/' + latest.id + '/log?offset=0&limitBytes=65536', cookies);
      console.log('Log status:', logRes.status);
      if (logRes.status === 200) {
        var log = JSON.parse(logRes.body);
        var entries = log.entries || [];
        console.log('Total entries:', entries.length);
        for (var j = entries.length - 1; j >= Math.max(0, entries.length - 30); j--) {
          var e = entries[j];
          if (e.chunk && e.chunk.length > 3) {
            var garbled = /[褰鈥睍]/.test(e.chunk);
            var chinese = /[\u4e00-\u9fff]/.test(e.chunk);
            console.log('[' + (e.stream || '?') + '] garbled=' + garbled + ' chinese=' + chinese + ' len=' + e.chunk.length + ': "' + e.chunk.substring(0, 200) + '"');
          }
        }
      }
    }
  } else {
    for (var k = 0; k < active.length; k++) {
      var run = active[k];
      console.log('\nChecking run:', run.id.slice(0, 8));
      var logRes2 = await get('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=65536', cookies);
      if (logRes2.status === 200) {
        var log2 = JSON.parse(logRes2.body);
        var entries2 = log2.entries || [];
        console.log('Entries:', entries2.length);
        for (var m = entries2.length - 1; m >= Math.max(0, entries2.length - 20); m--) {
          var e2 = entries2[m];
          if (e2.chunk && e2.chunk.length > 3) {
            var garbled2 = /[褰鈥睍]/.test(e2.chunk);
            var chinese2 = /[\u4e00-\u9fff]/.test(e2.chunk);
            console.log('[' + (e2.stream || '?') + '] garbled=' + garbled2 + ' chinese=' + chinese2 + ' len=' + e2.chunk.length + ': "' + e2.chunk.substring(0, 200) + '"');
          }
        }
      }
    }
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
