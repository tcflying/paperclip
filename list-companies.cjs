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
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');
  
  var res = await api('GET', '/api/companies', null, cookie);
  var companies = JSON.parse(res.b);
  
  var active = [];
  var archived = [];
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].status === 'active') {
      active.push(companies[i]);
    } else {
      archived.push(companies[i]);
    }
  }
  
  console.log('Active companies (' + active.length + '):');
  for (var j = 0; j < active.length; j++) {
    console.log('  - ' + active[j].name + ' (' + active[j].issuePrefix + ')');
  }
  
  console.log('\nArchived companies (' + archived.length + '):');
  for (var k = 0; k < archived.length; k++) {
    console.log('  - ' + archived[k].name + ' (' + archived[k].issuePrefix + ')');
  }
  
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
