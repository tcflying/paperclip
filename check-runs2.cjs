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

var garbled = /[褰鈥睍]/;
var chinese = /[\u4e00-\u9fff]/;

async function main() {
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');

  var companies = JSON.parse(login.b);
  var finalTest = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].issuePrefix === 'FINA') { finalTest = companies[i]; break; }
  }
  if (!finalTest) { console.log('FinalTest not found'); process.exit(0); }
  console.log('FinalTest:', finalTest.id, finalTest.issuePrefix);

  var runsRes = await api('GET', '/api/companies/' + finalTest.id + '/heartbeat-runs?limit=10', null, cookie);
  var runs = JSON.parse(runsRes.b);
  if (!Array.isArray(runs)) runs = runs.items || [];
  console.log('Heartbeat runs:', runs.length);
  for (var i = 0; i < runs.length; i++) {
    console.log('  [' + i + ']', runs[i].id.slice(0, 8), 'status=' + runs[i].status + ' agent=' + (runs[i].agentId || '').slice(0, 8));
  }

  var issueId = '2b45fdf9-6eca-41bd-ae95-8e9c5139d585';
  var commentsRes = await api('GET', '/api/issues/' + issueId + '/comments?order=desc&limit=20', null, cookie);
  var comments = JSON.parse(commentsRes.b);
  if (!Array.isArray(comments)) comments = comments.items || [];
  console.log('\nComments:', comments.length);
  for (var i = 0; i < comments.length; i++) {
    var body = comments[i].body || '';
    console.log('  [' + i + '] garbled=' + garbled.test(body) + ' chinese=' + chinese.test(body) + ' len=' + body.length);
    if (body.length > 0) console.log('  "' + body.substring(0, 200) + '"');
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
