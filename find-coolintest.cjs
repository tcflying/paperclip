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
  
  var res = await doGet('/api/companies', cookie);
  var companies = JSON.parse(res.b);
  
  // Find CoolinTest
  var coolin = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].name === 'CoolinTest') {
      coolin = companies[i];
      break;
    }
  }
  
  if (!coolin) {
    console.log('CoolinTest not found');
    process.exit(0);
  }
  
  console.log('CoolinTest:', JSON.stringify(coolin));
  console.log('ID:', coolin.id);
  console.log('IssuePrefix:', coolin.issuePrefix);
  
  // Get issues
  var issuesRes = await doGet('/api/companies/' + coolin.id + '/issues?limit=5', cookie);
  console.log('Issues status:', issuesRes.s);
  console.log('Issues body:', issuesRes.b.substring(0, 200));
  
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
