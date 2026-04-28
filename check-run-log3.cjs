const http = require("http");

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

async function main() {
  var loginRes = await api("POST", "/api/auth/sign-in/email", { email: "datobig18@gmail.com", password: "666888abc" });
  var cookies = (loginRes.setCookie || []).map(function(c) { return c.split(";")[0]; }).join("; ");
  if (!cookies) { console.log("Login failed"); process.exit(1); }
  
  var runId = "86077ca2-14a8-4d39-9736-3fc5ad85fbbb";
  
  var logRes = await api("GET", "/api/heartbeat-runs/" + runId + "/log?offset=0&limitBytes=100000", null, cookies);
  console.log("Log status:", logRes.status);
  
  if (logRes.status === 200) {
    var logData = JSON.parse(logRes.body);
    var entries = logData.entries || [];
    console.log("Total entries:", entries.length);
    
    console.log("\n=== LOG ENTRIES (last 20) ===");
    for (var i = Math.max(0, entries.length - 20); i < entries.length; i++) {
      var entry = entries[i];
      var chunk = entry.chunk || "";
      console.log("\n[" + i + "] stream=" + (entry.stream || "?") + " len=" + chunk.length);
      console.log(chunk.substring(0, 500));
    }
  } else {
    console.log("Error:", logRes.body);
  }
  
  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
