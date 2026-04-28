var http = require('http');
var HOST = '192.168.50.233';
var PORT = 3100;

function doPost(path, body, cookie) {
  var data = JSON.stringify(body);
  var headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
  if (cookie) headers['Cookie'] = cookie;
  var opts = { hostname: HOST, port: PORT, path: path, method: 'POST', headers: headers };
  return new Promise(function(resolve, reject) {
    var req = http.request(opts, function(res) {
      var chunks = '';
      var sc = res.headers['set-cookie'] || [];
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() { resolve({ s: res.statusCode, b: chunks, c: sc }); });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function doGet(path, cookie) {
  var headers = {};
  if (cookie) headers['Cookie'] = cookie;
  var opts = { hostname: HOST, port: PORT, path: path, headers: headers };
  return new Promise(function(resolve, reject) {
    var req = http.get(opts, function(res) {
      var chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() { resolve({ s: res.statusCode, b: chunks }); });
    });
    req.on('error', reject);
  });
}

function garbled(s) { return /[褰鈥睍]/.test(s); }
function chinese(s) { return /[\u4e00-\u9fff]/.test(s); }

async function main() {
  var login = await doPost('/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = login.c.map(function(x) { return x.split(';')[0]; }).join('; ');

  var companyId = 'f874b4c2-d35d-41b6-b8a9-a83636c0c0ec';

  // Get heartbeat runs
  var runsRes = await doGet('/api/companies/' + companyId + '/heartbeat-runs?limit=20', cookie);
  var runs = JSON.parse(runsRes.b);
  if (!Array.isArray(runs)) runs = runs.items || [];
  console.log('Heartbeat runs:', runs.length);
  for (var i = 0; i < runs.length; i++) {
    var run = runs[i];
    console.log('[' + i + '] ' + run.id.slice(0, 8) + ' status=' + run.status + ' agent=' + (run.agentId || 'none').slice(0, 8));
  }

  // Check the latest 3 runs
  var latest = runs.slice(-3);
  for (var j = 0; j < latest.length; j++) {
    var run = latest[j];
    console.log('\nChecking run ' + run.id.slice(0, 8) + '...');
    var logRes = await doGet('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=131072', cookie);
    if (logRes.s === 200) {
      var log = JSON.parse(logRes.b);
      var entries = log.entries || [];
      console.log('  Entries:', entries.length);
      // Check last 50 entries
      var last = entries.slice(-50);
      for (var k = 0; k < last.length; k++) {
        var e = last[k];
        if (e.chunk && e.chunk.length > 5) {
          var g = garbled(e.chunk);
          var c = chinese(e.chunk);
          console.log('  [' + (e.stream || '?') + '] garbled=' + g + ' chinese=' + c + ' len=' + e.chunk.length);
          console.log('    "' + e.chunk.substring(0, 150) + '"');
        }
      }
    } else {
      console.log('  Log error:', logRes.s);
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
