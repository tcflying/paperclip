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

  // Get issues
  var issuesRes = await doGet('/api/companies/' + companyId + '/issues?limit=10', cookie);
  var issues = JSON.parse(issuesRes.b);
  if (!Array.isArray(issues)) issues = issues.items || [];
  console.log('Issues:', issues.length);

  for (var i = 0; i < Math.min(issues.length, 5); i++) {
    var issue = issues[i];
    console.log('\nIssue[' + i + ']:', issue.number || issue.id, 'status=' + issue.status);
    
    // Get comments
    var commentsRes = await doGet('/api/issues/' + issue.id + '/comments?order=desc&limit=10', cookie);
    if (commentsRes.s === 200) {
      var comments = JSON.parse(commentsRes.b);
      if (!Array.isArray(comments)) comments = comments.items || [];
      console.log('  Comments:', comments.length);
      for (var j = 0; j < comments.length; j++) {
        var comment = comments[j];
        if (comment.body) {
          var g = garbled(comment.body);
          var c = chinese(comment.body);
          console.log('  Comment[' + j + ']: garbled=' + g + ' chinese=' + c);
          console.log('    "' + comment.body.substring(0, 200) + '"');
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
