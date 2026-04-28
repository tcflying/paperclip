var http = require('http');
var HOST = 'localhost';
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
  // Login
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');
  console.log('Login:', login.s, cookie.length > 0 ? 'OK' : 'FAIL');

  // Get all companies
  var companiesRes = await api('GET', '/api/companies', null, cookie);
  var companies = JSON.parse(companiesRes.b);
  console.log('Companies:', companies.length);

  // Archive each company
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    console.log('[' + i + '] ' + c.name + ' (' + c.id + ') status=' + c.status + ' prefix=' + c.issuePrefix);
    
    // Archive the company
    var archiveRes = await api('POST', '/api/companies/' + c.id + '/archive', null, cookie);
    console.log('  Archive:', archiveRes.s);
    
    // Or try delete
    // var delRes = await api('DELETE', '/api/companies/' + c.id, null, cookie);
    // console.log('  Delete:', delRes.s);
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
