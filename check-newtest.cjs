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

  // Find NewTest company
  var res = await doGet('/api/companies', cookie);
  var companies = JSON.parse(res.b);
  
  var newTest = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].name === 'NewTest') {
      newTest = companies[i];
      break;
    }
  }
  
  if (!newTest) {
    console.log('NewTest not found. Last 5 companies:');
    for (var j = Math.max(0, companies.length - 5); j < companies.length; j++) {
      console.log('  ' + companies[j].name + ' prefix=' + (companies[j].issuePrefix || 'none'));
    }
    process.exit(0);
  }
  
  console.log('NewTest: id=' + newTest.id + ' prefix=' + (newTest.issuePrefix || 'none') + ' status=' + newTest.status);
  
  // Check issues
  var issuesRes = await doGet('/api/companies/' + newTest.id + '/issues?limit=10', cookie);
  var issues = JSON.parse(issuesRes.b);
  if (!Array.isArray(issues)) issues = issues.items || [];
  console.log('Issues:', issues.length);
  
  for (var k = 0; k < issues.length; k++) {
    var issue = issues[k];
    console.log('  [' + k + '] ' + (issue.number || issue.id) + ' status=' + issue.status);
    
    // Check comments
    var commentsRes = await doGet('/api/issues/' + issue.id + '/comments?order=desc&limit=5', cookie);
    if (commentsRes.s === 200) {
      var comments = JSON.parse(commentsRes.b);
      if (!Array.isArray(comments)) comments = comments.items || [];
      for (var m = 0; m < comments.length; m++) {
        var comment = comments[m];
        if (comment.body) {
          var g = garbled(comment.body);
          var c = chinese(comment.body);
          console.log('    Comment[' + m + ']: garbled=' + g + ' chinese=' + c);
          console.log('    "' + comment.body.substring(0, 150) + '"');
        }
      }
    }
  }
  
  // Check heartbeat runs
  var runsRes = await doGet('/api/companies/' + newTest.id + '/heartbeat-runs?limit=5', cookie);
  var runs = JSON.parse(runsRes.b);
  if (!Array.isArray(runs)) runs = runs.items || [];
  console.log('Heartbeat runs:', runs.length);
  for (var n = 0; n < runs.length; n++) {
    var run = runs[n];
    console.log('  Run[' + n + ']: ' + run.id.slice(0, 8) + ' status=' + run.status);
    
    // Check log
    var logRes = await doGet('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=65536', cookie);
    if (logRes.s === 200) {
      var log = JSON.parse(logRes.b);
      var entries = log.entries || [];
      console.log('    Log entries:', entries.length);
      for (var p = 0; p < Math.min(entries.length, 10); p++) {
        var e = entries[p];
        if (e.chunk && e.chunk.length > 5) {
          console.log('    [' + (e.stream || '?') + '] garbled=' + garbled(e.chunk) + ' chinese=' + chinese(e.chunk) + ': "' + e.chunk.substring(0, 100) + '"');
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
