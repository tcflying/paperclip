var http = require('http');
var HOST = '192.168.50.233';
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

function garbled(s) { return s && /[褰鈥睍]/.test(s); }

async function main() {
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');

  // Find KO company
  var companies = JSON.parse((await api('GET', '/api/companies', null, cookie)).b);
  var ko = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].issuePrefix === 'KO') { ko = companies[i]; break; }
  }
  if (!ko) { console.log('KO not found'); process.exit(0); }
  console.log('KO company: ' + ko.id);

  // Get all heartbeat runs
  var runsRes = await api('GET', '/api/companies/' + ko.id + '/heartbeat-runs?limit=50', null, cookie);
  var runs = JSON.parse(runsRes.b);
  if (!Array.isArray(runs)) runs = runs.items || [];
  console.log('Runs: ' + runs.length);

  // Get agents
  var agentsRes = await api('GET', '/api/companies/' + ko.id + '/agents', null, cookie);
  var agents = JSON.parse(agentsRes.b);
  if (!Array.isArray(agents)) agents = agents.items || [];
  for (var a = 0; a < agents.length; a++) {
    console.log('Agent: ' + agents[a].name + ' (' + agents[a].role + ') id=' + agents[a].id.slice(0, 8));
  }

  // Check each run's log for garbled text
  for (var i = 0; i < Math.min(runs.length, 20); i++) {
    var run = runs[i];
    var agentName = 'unknown';
    for (var a = 0; a < agents.length; a++) {
      if (agents[a].id === run.agentId) { agentName = agents[a].name; break; }
    }
    console.log('\nRun[' + i + '] ' + run.id.slice(0, 8) + ' agent=' + agentName + ' status=' + run.status + ' created=' + run.createdAt);

    var logRes = await api('GET', '/api/heartbeat-runs/' + run.id + '/log?offset=0&limitBytes=10000', null, cookie);
    if (logRes.s === 200) {
      var log = JSON.parse(logRes.b);
      var entries = log.entries || [];
      var hasGarbled = false;
      for (var k = 0; k < entries.length; k++) {
        var e = entries[k];
        if (e.chunk && garbled(e.chunk)) {
          hasGarbled = true;
          console.log('  GARBLED [' + e.stream + ']: ' + e.chunk.substring(0, 100));
        }
      }
      if (!hasGarbled) console.log('  No garbled in ' + entries.length + ' entries');
    }
  }

  // Check all issues
  var issuesRes = await api('GET', '/api/companies/' + ko.id + '/issues?limit=20', null, cookie);
  var issues = JSON.parse(issuesRes.b);
  if (!Array.isArray(issues)) issues = issues.items || [];
  console.log('\n\nIssues: ' + issues.length);
  for (var i = 0; i < issues.length; i++) {
    var issue = issues[i];
    console.log('\nIssue[' + i + '] ' + (issue.number || issue.id.slice(0,8)) + ' title=' + issue.title);
    console.log('  title garbled=' + garbled(issue.title) + ' body garbled=' + garbled(issue.body));

    var commentsRes = await api('GET', '/api/issues/' + issue.id + '/comments?order=asc&limit=20', null, cookie);
    var comments = JSON.parse(commentsRes.b);
    if (!Array.isArray(comments)) comments = comments.items || [];
    for (var j = 0; j < comments.length; j++) {
      var c = comments[j];
      var authorName = c.authorName || c.authorAgentId || 'user';
      console.log('  Comment[' + j + '] author=' + authorName + ' garbled=' + garbled(c.body) + ': ' + (c.body || '').substring(0, 80));
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
