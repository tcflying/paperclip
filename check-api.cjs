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

function garbled(s) { 
  if (!s) return false;
  if (/[褰鈥睍]/.test(s)) return true;
  if (/[��]/.test(s)) return true;
  return false;
}

async function main() {
  var login = await api('POST', '/api/auth/sign-in/email', { email: 'datobig18@gmail.com', password: '666888abc' });
  var cookie = (login.c || []).map(function(x) { return x.split(';')[0]; }).join('; ');
  
  // Get KO-3 comments
  console.log('=== KO-3 Comments ===');
  var res = await api('GET', '/api/issues/KO-3/comments?order=desc&limit=20', null, cookie);
  var comments = JSON.parse(res.b);
  if (!Array.isArray(comments)) comments = comments.items || [];
  console.log('Comments:', comments.length);
  
  for (var i = 0; i < Math.min(comments.length, 10); i++) {
    var comment = comments[i];
    if (comment.body) {
      var g = garbled(comment.body);
      var c = /[\u4e00-\u9fff]/.test(comment.body);
      console.log('[' + i + '] garbled=' + g + ' chinese=' + c + ' author=' + (comment.authorName || 'unknown'));
      console.log('  ' + comment.body.substring(0, 200));
    }
  }
  
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
