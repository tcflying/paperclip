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
  console.log('Login:', login.s);
  var cookie = login.c.map(function(x) { return x.split(';')[0]; }).join('; ');

  var companyId = 'f874b4c2-d35d-41b6-b8a9-a83636c0c0ec'; // CoolinTest

  // Get issues
  var issuesRes = await doGet('/api/companies/' + companyId + '/issues?limit=5', cookie);
  var issues = JSON.parse(issuesRes.b).items || [];
  console.log('Issues:', issues.length);
  
  for (var i = 0; i < Math.min(issues.length, 3); i++) {
    var issue = issues[i];
    console.log('\nIssue[' + i + ']:', issue.number, 'status=' + issue.status, 'assignee=' + (issue.assigneeId || 'none'));
    
    // Get comments
    var commentsRes = await doGet('/api/issues/' + issue.id + '/comments?order=desc&limit=5', cookie);
    if (commentsRes.s === 200) {
      var comments = JSON.parse(commentsRes.b);
      var items = comments.items || comments || [];
      console.log('  Comments:', items.length);
      for (var j = 0; j < items.length; j++) {
        var comment = items[j];
        if (comment.body) {
          var g = garbled(comment.body);
          var c = chinese(comment.body);
          console.log('  Comment[' + j + ']: garbled=' + g + ' chinese=' + c + ' author=' + (comment.authorName || comment.authorId || 'none'));
          console.log('    "' + comment.body.substring(0, 200) + '"');
        }
      }
    }
  }

  // Check heartbeat runs for this company
  var runsRes = await doGet('/api/companies/' + companyId + '/heartbeat-runs?limit=3', cookie);
  var runs = JSON.parse(runsRes.b).items || [];
  var active = runs.filter(function(r) { return r.status !== 'completed'; });
  console.log('\nHeartbeat runs:', runs.length, 'total,', active.length, 'active');
  
  if (active.length > 0) {
    var run = active[0];
    console.log('Checking run:', run.id.slice(0, 8));
    var logRes = await doGet('/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=65536', cookie);
    if (logRes.s === 200) {
      var log = JSON.parse(logRes.b);
      var entries = log.entries || [];
      console.log('Log entries:', entries.length);
      var last = entries.slice(-30);
      for (var k = 0; k < last.length; k++) {
        var e = last[k];
        if (e.chunk && e.chunk.length > 3) {
          var g = garbled(e.chunk);
          var c = chinese(e.chunk);
          console.log('[' + (e.stream || '?') + '] garbled=' + g + ' chinese=' + c + ' len=' + e.chunk.length);
          console.log('  "' + e.chunk.substring(0, 200) + '"');
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
