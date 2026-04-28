var http = require('http');
var HOST = '192.168.50.233';
var PORT = 3100;

function api(method, path, body, cookie) {
  return new Promise(function(resolve, reject) {
    var headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;
    var req;
    var data = body ? JSON.stringify(body) : null;
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(data);
      req = http.request({ hostname: HOST, port: PORT, path: path, method: method, headers: headers }, function(res) {
        var chunks = '';
        var sc = res.headers['set-cookie'] || [];
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() { resolve({ s: res.statusCode, b: chunks, c: sc }); });
      });
      req.write(data);
    } else {
      req = http.get({ hostname: HOST, port: PORT, path: path, headers: headers }, function(res) {
        var chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() { resolve({ s: res.statusCode, b: chunks }); });
      });
    }
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');
  
  console.log('Checking adapter heartbeat runs for process.encoding issue...');
  
  // Check all heartbeat runs
  var res = await api('GET', '/api/companies', null, cookie);
  var companies = JSON.parse(res.b);
  console.log('Companies:', companies.length);
  
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    var runsRes = await api('GET', '/api/companies/' + c.id + '/heartbeat-runs?limit=5', null, cookie);
    var runs = JSON.parse(runsRes.b);
    if (!Array.isArray(runs)) runs = runs.items || [];
    if (runs.length === 0) continue;
    console.log('\nCompany ' + c.name + ': ' + runs.length + ' runs');
    for (var j = 0; j < Math.min(runs.length, 3); j++) {
      var run = runs[j];
      console.log('  Run ' + run.id.slice(0, 8) + ' status=' + run.status);
      
      // Check log
      var logRes = await api('GET', '/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=10000', null, cookie);
      if (logRes.s === 200) {
        var log = JSON.parse(logRes.b);
        var entries = log.entries || [];
        console.log('    Log entries: ' + entries.length);
        for (var k = 0; k < entries.length; k++) {
          var e = entries[k];
          if (e.chunk && e.chunk.length > 3) {
            var garbled = /[褰鈥睍]/.test(e.chunk);
            console.log('    [' + (e.stream || '?') + '] garbled=' + garbled + ' len=' + e.chunk.length + ': "' + e.chunk.substring(0, 50) + '"');
          }
        }
      }
    }
  }
  
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
