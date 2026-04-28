var http = require("http");

function api(method, urlPath, body, cookies) {
  return new Promise(function(resolve, reject) {
    var data = body ? JSON.stringify(body) : "";
    var headers = { "Content-Type": "application/json" };
    if (cookies) headers["Cookie"] = cookies;
    var opts = { hostname: "192.168.50.233", port: 3100, path: urlPath, method: method, headers: headers };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    var req = http.request(opts, function(res) {
      var bodyData = "";
      var setCookie = res.headers["set-cookie"] || [];
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve({ status: res.statusCode, body: bodyData, setCookie: setCookie, headers: res.headers }); });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function hasGarbled(text) {
  if (!text) return false;
  var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪", "\ufffd"];
  for (var i = 0; i < garbledChars.length; i++) {
    if (text.indexOf(garbledChars[i]) >= 0) return true;
  }
  return false;
}

async function main() {
  var loginRes = await api("POST", "/api/auth/sign-in/email", { email: "datobig18@gmail.com", password: "666888abc" });
  var cookies = (loginRes.setCookie || []).map(function(c) { return c.split(";")[0]; }).join("; ");
  if (!cookies) { console.log("Login failed:", loginRes.body); process.exit(1); }
  console.log("Logged in");

  var companiesRes = await api("GET", "/api/companies", null, cookies);
  var companies = JSON.parse(companiesRes.body);
  console.log("Companies count:", companies.length);
  
  var da = null;
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    if (c.name === "DA") { da = c; break; }
  }
  if (!da) {
    console.log("All names:", companies.map(function(c) { return c.name; }).join(", "));
    process.exit(1);
  }
  console.log("DA company:", da.id, "name:", da.name);

  console.log("\n=== ISSUES ===");
  var issuesRes = await api("GET", "/api/companies/" + da.id + "/issues?limit=20", null, cookies);
  console.log("Issues status:", issuesRes.status);
  var issuesData = JSON.parse(issuesRes.body);
  var issues = Array.isArray(issuesData) ? issuesData : (issuesData.items || []);
  console.log("Issues count:", issues.length);
  
  for (var ii = 0; ii < issues.length; ii++) {
    var issue = issues[ii];
    console.log("\nIssue:", issue.number || issue.id.slice(0,8), "title:", JSON.stringify(issue.title).substring(0, 100));
    console.log("  garbled title:", hasGarbled(issue.title));

    var commentsUrl = "/api/companies/" + da.id + "/issues/" + issue.id + "/comments?limit=50";
    var commentsRes = await api("GET", commentsUrl, null, cookies);
    if (commentsRes.status === 200) {
      var comments = JSON.parse(commentsRes.body);
      if (!Array.isArray(comments)) comments = comments.items || [];
      console.log("  Comments:", comments.length);
      for (var ci = 0; ci < comments.length; ci++) {
        var comment = comments[ci];
        var bodyText = comment.body || comment.text || comment.content || "";
        var garbled = hasGarbled(bodyText);
        var hasChinese = /[\u4e00-\u9fff]/.test(bodyText);
        var author = comment.authorName || (comment.agentId ? "agent:" + comment.agentId.slice(0,8) : "user:" + (comment.userId || "").slice(0,8));
        console.log("  [" + ci + "] by=" + author + " garbled=" + garbled + " chinese=" + hasChinese + " len=" + bodyText.length);
        if (garbled) {
          console.log("    TEXT: " + bodyText.substring(0, 400));
          var buf = Buffer.from(bodyText, "utf8");
          console.log("    HEX(100): " + buf.slice(0, 100).toString("hex"));
        } else if (hasChinese) {
          console.log("    TEXT: " + bodyText.substring(0, 200));
        }
      }
    } else {
      console.log("  Comments error:", commentsRes.status);
    }
  }

  console.log("\n=== HEARTBEAT RUNS (recent) ===");
  var runsRes = await api("GET", "/api/companies/" + da.id + "/heartbeat-runs?limit=20", null, cookies);
  var runsData = JSON.parse(runsRes.body);
  var runs = runsData.items || runsData;
  console.log("Runs count:", Array.isArray(runs) ? runs.length : "not array");
  
  if (Array.isArray(runs)) {
    for (var ri = 0; ri < runs.length; ri++) {
      var run = runs[ri];
      var rj = run.resultJson || {};
      var summary = rj.summary || "";
      var result = rj.result || "";
      var sGarbled = hasGarbled(summary);
      var rGarbled = hasGarbled(result);
      var hasChinese = /[\u4e00-\u9fff]/.test(summary) || /[\u4e00-\u9fff]/.test(result);
      
      if (sGarbled || rGarbled || hasChinese) {
        console.log("\nRun[" + ri + "] id=" + run.id.slice(0,8) + " agent=" + (run.agentId || "").slice(0,8) + " status=" + run.status);
        if (summary) {
          console.log("  summary garbled=" + sGarbled + ": " + summary.substring(0, 200));
        }
        if (result && typeof result === "string") {
          console.log("  result garbled=" + rGarbled + ": " + result.substring(0, 200));
        }
        
        var logRes = await api("GET", "/api/heartbeat-runs/" + run.id + "/log?offset=0&limitBytes=65536", null, cookies);
        if (logRes.status === 200) {
          var logData = JSON.parse(logRes.body);
          var entries = logData.entries || [];
          var garbledEntries = [];
          for (var ei = 0; ei < entries.length; ei++) {
            if (entries[ei].chunk && hasGarbled(entries[ei].chunk)) {
              garbledEntries.push(ei);
            }
          }
          if (garbledEntries.length > 0) {
            console.log("  GARBLED log entries:", garbledEntries.length, "/", entries.length);
            for (var ge = 0; ge < Math.min(garbledEntries.length, 3); ge++) {
              var gei = garbledEntries[ge];
              var e = entries[gei];
              console.log("    entry[" + gei + "] stream=" + (e.stream || "?") + ": " + e.chunk.substring(0, 300));
            }
          }
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
