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

  var companyId = 'ec1f5d6b-6442-4c94-a494-df028da1616d'; // UTF8Playwright

  // Check agents
  var agentsRes = await doGet('/api/companies/' + companyId + '/agents', cookie);
  console.log('Agents:', agentsRes.s, JSON.parse(agentsRes.b).items ? JSON.parse(agentsRes.b).items.length : 'no items');
  
  // Check ALL heartbeat runs (no limit)
  var runsRes = await doGet('/api/companies/' + companyId + '/heartbeat-runs', cookie);
  var runs = JSON.parse(runsRes.b).items || [];
  console.log('All runs (no limit):', runs.length);
  for (var i = 0; i < runs.length; i++) {
    console.log('  Run[' + i + ']:', runs[i].id.slice(0, 8), 'status=' + runs[i].status, 'agentId=' + (runs[i].agentId || 'none').slice(0, 8));
  }
  
  // Check issues
  var issuesRes = await doGet('/api/companies/' + companyId + '/issues?limit=10', cookie);
  var issues = JSON.parse(issuesRes.b).items || [];
  console.log('Issues:', issues.length);
  for (var j = 0; j < issues.length; j++) {
    var issue = issues[j];
    console.log('  Issue[' + j + ']:', issue.number, 'status=' + issue.status, 'assignee=' + (issue.assigneeId || 'none').slice(0, 8));
  }

  // Check live-runs
  var liveRes = await doGet('/api/companies/' + companyId + '/live-runs', cookie);
  console.log('Live runs:', liveRes.s, liveRes.b.substring(0, 100));

  // Check if there's an onboarding project with issue
  var projectsRes = await doGet('/api/companies/' + companyId + '/projects', cookie);
  console.log('Projects:', projectsRes.s, JSON.parse(projectsRes.b).items ? JSON.parse(projectsRes.b).items.length : 'no items');
  
  // Try to get comments for any issues
  if (issues.length > 0) {
    var issueId = issues[0].id;
    var commentsRes = await doGet('/api/issues/' + issueId + '/comments?order=desc&limit=5', cookie);
    console.log('Comments for ' + issues[0].number + ':', commentsRes.s);
    if (commentsRes.s === 200) {
      var comments = JSON.parse(commentsRes.b);
      var commentItems = comments.items || comments || [];
      console.log('  Comments:', commentItems.length);
      for (var k = 0; k < commentItems.length; k++) {
        var comment = commentItems[k];
        if (comment.body) {
          var g = garbled(comment.body);
          var c = chinese(comment.body);
          console.log('  Comment[' + k + ']: garbled=' + g + ' chinese=' + c + ' len=' + comment.body.length);
          console.log('    "' + comment.body.substring(0, 200) + '"');
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
