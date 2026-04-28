var http = require('http');
var HOST = '192.168.50.233';
var PORT = 3100;

function api(method, path, body, cookie) {
  return new Promise(function(resolve, reject) {
    var headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;
    var req;
    if (method === 'POST' && body) {
      var data = JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(data);
      req = http.request({ hostname: HOST, port: PORT, path: path, method: method, headers: headers }, function(res) {
        var chunks = '';
        var sc = res.headers['set-cookie'] || [];
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() { resolve({ s: res.statusCode, b: chunks, c: sc });
      });
      req.write(data);
    } else {
      req = http.get({ hostname: HOST, port: PORT, path: path, headers: headers }, function(res) {
        var chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() { resolve({ s: res.statusCode, b: chunks });
      });
    }
    req.on('error', reject);
    req.end();
  });
}

// More comprehensive garbled detection
function isGarbled(s) {
  if (!s) return false;
  // Pattern 1: mojibake from UTF-8 interpreted as GBK
  if (/[褰鈥睍]/.test(s)) return true;
  // Pattern 2: GBK double-bytes garbled as UTF-8
  if (/\xC2[\x80-\xBF]|\xC3[\x80-\xBF]/.test(s)) return true;
  // Pattern 3: other common garbled patterns
  if (/[ֻƸ××]/.test(s)) return true;
  // Pattern 4: Check for latin1 replacements
  if (/[\x80-\xBF]{2,}/.test(s)) return true;
  return false;
}

function hasChinese(s) { return s && /[\u4e00-\u9fff]/.test(s); }

async function main() {
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');
  var companies = JSON.parse(login.b);
  var finalTest = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].issuePrefix === 'FINA') { finalTest = companies[i]; break; }
  }
  if (!finalTest) { console.log('FINA not found'); process.exit(0); }
  console.log('FINA:', finalTest.id);

  var runsRes = await api('GET', '/api/companies/' + finalTest.id + '/heartbeat-runs?limit=10', null, cookie);
  var runs = JSON.parse(runsRes.b);
  if (!Array.isArray(runs)) runs = runs.items || [];
  console.log('Runs:', runs.length);
  for (var i = 0; i < runs.length; i++) {
    console.log('  [' + i + ']', runs[i].id.slice(0, 8), runs[i].status, (runs[i].agentId || '').slice(0, 8));
    var logRes = await api('GET', '/api/heartbeat-runs/' + runs[i].id + '/log?offset=0&limitBytes=65536', null, cookie);
    if (logRes.s === 200) {
      var log = JSON.parse(logRes.b);
      var entries = log.entries || [];
      console.log('    Entries:', entries.length);
      for (var j = 0; j < Math.min(entries.length, 20); j++) {
        var e = entries[j];
        if (e.chunk && e.chunk.length > 3) {
          var g = isGarbled(e.chunk);
          var c = hasChinese(e.chunk);
          console.log('    [' + j + '] garbled=' + g + ' chinese=' + c + ' len=' + e.chunk.length);
          console.log('    Chunk: "' + e.chunk.substring(0, 200) + '"');
        }
      }
    }
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
