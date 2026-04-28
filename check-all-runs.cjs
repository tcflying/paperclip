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

function getCookies(sc) {
  return sc.map(function(x) { return x.split(';')[0]; }).join('; ');
}

function garbled(s) { return /[褰鈥睍]/.test(s); }
function chinese(s) { return /[\u4e00-\u9fff]/.test(s); }

async function main() {
  var login = await doPost('/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  console.log('Login:', login.s);
  var cookie = getCookies(login.c);

  var companiesRes = await doGet('/api/companies', cookie);
  var companies = JSON.parse(companiesRes.b);

  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    console.log('\n[' + i + '] ' + c.name + ' prefix=' + (c.issuePrefix || 'none') + ' id=' + c.id.slice(0, 8));

    var runsRes = await doGet('/api/companies/' + c.id + '/heartbeat-runs?limit=5', cookie);
    var runs = JSON.parse(runsRes.b).items || [];
    var active = runs.filter(function(r) { return r.status !== 'completed'; });
    console.log('  Runs: ' + runs.length + ' total, ' + active.length + ' active');

    if (active.length > 0) {
      var run = active[0];
      console.log('  Active run:', run.id.slice(0, 8), run.status);
      var logRes = await doGet('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=65536', cookie);
      if (logRes.s === 200) {
        var log = JSON.parse(logRes.b);
        var entries = log.entries || [];
        console.log('  Log entries:', entries.length);
        var last = entries.slice(-20);
        for (var j = 0; j < last.length; j++) {
          var e = last[j];
          if (e.chunk && e.chunk.length > 3) {
            console.log('  [' + (e.stream || '?') + '] garbled=' + garbled(e.chunk) + ' chinese=' + chinese(e.chunk) + ' len=' + e.chunk.length);
            console.log('    "' + e.chunk.substring(0, 200) + '"');
          }
        }
      }
    }
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
