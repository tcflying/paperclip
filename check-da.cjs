var http = require("http");

function api(method, urlPath, body, cookies) {
  return new Promise(function(resolve, reject) {
    var data = body ? JSON.stringify(body) : "";
    var headers = { "Content-Type": "application/json" };
    if (cookies) headers["Cookie"] = cookies;
    var opts = { hostname: "localhost", port: 3100, path: urlPath, method: method, headers: headers };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    var req = http.request(opts, function(res) {
      var bodyData = "";
      var setCookie = res.headers["set-cookie"] || [];
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve({ status: res.statusCode, body: bodyData, setCookie: setCookie }); });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function hasGarbled(text) {
  if (!text) return false;
  var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
  for (var i = 0; i < garbledChars.length; i++) {
    if (text.includes(garbledChars[i])) return true;
  }
  if (text.indexOf("\ufffd") >= 0 && /[\u4e00-\u9fff]/.test(text)) return true;
  return false;
}

async function main() {
  var loginRes = await api("POST", "/api/auth/sign-in/email", { email: "datobig18@gmail.com", password: "666888abc" });
  var cookies = (loginRes.setCookie || []).map(function(c) { return c.split(";")[0]; }).join("; ");
  if (!cookies) { console.log("Login failed"); process.exit(1); }
  console.log("Logged in");

  var companiesRes = await api("GET", "/api/companies", null, cookies);
  var companiesRaw = JSON.parse(companiesRes.body);
  var companies = Array.isArray(companiesRaw) ? companiesRaw : (companiesRaw.items || []);
  console.log("Companies count:", companies.length, "keys of first:", companies[0] ? Object.keys(companies[0]).join(",") : "none");
  var da = null;
  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    var slug = c.slug || c.id;
    var name = c.name || c.companyName || c.slug || "";
    if (slug === "DA" || name === "DA") { da = c; break; }
  }
  if (!da) {
    console.log("Listing all company names and slugs...");
    for (var j = 0; j < companies.length; j++) {
      var cc = companies[j];
      console.log("  name=" + cc.name + " status=" + cc.status);
    }
    process.exit(1);
  }
  console.log("DA company:", da.id, "slug:", da.slug || da.id);

  var issuesRes = await api("GET", "/api/companies/" + da.id + "/issues?limit=20", null, cookies);
  var issues = JSON.parse(issuesRes.body);
  if (!Array.isArray(issues)) issues = issues.items || [];
  console.log("\n=== ISSUES ===");
  for (var ii = 0; ii < issues.length; ii++) {
    var issue = issues[ii];
    var titleGarbled = hasGarbled(issue.title);
    console.log("Issue:", issue.number || issue.slug, "title:", JSON.stringify(issue.title).substring(0, 100), "garbled:", titleGarbled);

    var commentsRes = await api("GET", "/api/companies/" + da.id + "/issues/" + (issue.id) + "/comments?limit=50", null, cookies);
    if (commentsRes.status === 200) {
      var comments = JSON.parse(commentsRes.body);
      if (!Array.isArray(comments)) comments = comments.items || [];
      for (var ci = 0; ci < comments.length; ci++) {
        var c = comments[ci];
        var bodyText = c.body || c.text || c.content || "";
        var cGarbled = hasGarbled(bodyText);
        var author = c.authorName || c.author || (c.agentId ? "agent:" + c.agentId.slice(0, 8) : "user");
        if (cGarbled || /[\u4e00-\u9fff]/.test(bodyText)) {
          console.log("  Comment[" + ci + "] by=" + author + " garbled=" + cGarbled + " len=" + bodyText.length);
          if (cGarbled) {
            var snippet = bodyText.substring(0, 300);
            console.log("    TEXT: " + snippet);
            var buf = Buffer.from(bodyText, "utf8");
            console.log("    HEX(first 80): " + buf.slice(0, 80).toString("hex"));
          }
        }
      }
    }
  }

  console.log("\n=== HEARTBEAT RUNS ===");
  var runsRes = await api("GET", "/api/companies/" + da.id + "/heartbeat-runs?limit=30", null, cookies);
  var runsData = JSON.parse(runsRes.body);
  var runs = runsData.items || runsData;
  for (var ri = 0; ri < runs.length; ri++) {
    var run = runs[ri];
    var rj = run.resultJson || {};
    var summary = rj.summary || "";
    var result = rj.result || "";
    var sGarbled = hasGarbled(summary);
    var rGarbled = hasGarbled(result);
    if (sGarbled || rGarbled || /[\u4e00-\u9fff]/.test(summary) || /[\u4e00-\u9fff]/.test(result)) {
      console.log("Run[" + ri + "] id=" + run.id.slice(0, 8) + " agent=" + (run.agentId || "").slice(0, 8) + " status=" + run.status);
      console.log("  summary garbled=" + sGarbled + " result garbled=" + rGarbled);
      if (sGarbled) {
        console.log("  SUMMARY: " + summary.substring(0, 200));
      }
      if (rGarbled) {
        console.log("  RESULT: " + String(result).substring(0, 200));
      }
    }
  }

  console.log("\n=== RUN LOGS (checking raw stdout) ===");
  var recentRuns = runs.slice(0, 10);
  for (var li = 0; li < recentRuns.length; li++) {
    var lRun = recentRuns[li];
    var logRes = await api("GET", "/api/heartbeat-runs/" + lRun.id + "/log?offset=0&limitBytes=65536", null, cookies);
    if (logRes.status === 200) {
      var logData = JSON.parse(logRes.body);
      var entries = logData.entries || [];
      var hasGarbledEntry = false;
      for (var ei = 0; ei < entries.length; ei++) {
        var entry = entries[ei];
        if (entry.chunk && hasGarbled(entry.chunk)) {
          if (!hasGarbledEntry) {
            console.log("\nRun[" + li + "] id=" + lRun.id.slice(0, 8) + " HAS GARBLED LOG ENTRIES:");
            hasGarbledEntry = true;
          }
          console.log("  entry[" + ei + "] stream=" + (entry.stream || "?") + " len=" + entry.chunk.length);
          console.log("  TEXT: " + entry.chunk.substring(0, 200));
        }
      }
    }
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
