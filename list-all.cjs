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
    var opts = { hostname: '192.168.50.233', port: 3100, path: path, headers: { Cookie: cookies } };
    var req = http.get(opts, function(res) {
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
  
  var res = await get('/api/companies', cookies);
  var companies = JSON.parse(res.body);
  console.log('All companies:');
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    console.log('  [' + i + '] name=' + c.name + ' prefix=' + (c.prefix || c.slug || 'none') + ' issuePrefix=' + (c.issuePrefix || 'none') + ' id=' + (c.id || '').slice(0, 8));
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
