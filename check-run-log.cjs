var http = require("http");
var path = require("path");

function api(method, path, body, cookies) {
  return new Promise(function(resolve, reject) {
    var data = body ? JSON.stringify(body) : "";
    var headers = { "Content-Type": "application/json" };
    if (cookies) headers["Cookie"] = cookies;
    var opts = { hostname: "localhost", port: 3100, path: path, method: method, headers: headers };
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
  console.log("Cookies:", cookies.length > 0 ? "got" : "NONE");
  if (!cookies) { console.log("Login failed"); process.exit(1); }

  var companiesRes = await api("GET", "/api/companies", null, cookies);
  var companies = JSON.parse(companiesRes.body);
  var utfaa = null;
  for (var i = 0; i < companies.length; i++) {
    if (companies[i].name === "UTFAA") { utfaa = companies[i]; break; }
  }
  if (!utfaa) {
    console.log("UTFAA not found. Companies:", companies.map(function(c) { return c.name; }).join(", "));
    process.exit(1);
  }
  console.log("UTFAA:", utfaa.id);

  var runsRes = await api("GET", "/api/companies/" + utfaa.id + "/heartbeat-runs?limit=3", null, cookies);
  var runs = JSON.parse(runsRes.body).items || [];
  var active = runs.filter(function(r) { return r.status !== "completed"; });
  console.log("Active runs:", active.length);

  for (var j = 0; j < active.length; j++) {
    var run = active[j];
    console.log("\nRun", run.id.slice(0, 8), "status=" + run.status);
    var logRes = await api("GET", "/api/heartbeat-runs/" + run.id + "/log?offset=0&limitBytes=65536", null, cookies);
    if (logRes.status === 200) {
      var logData = JSON.parse(logRes.body);
      var entries = logData.entries || [];
      console.log("  " + entries.length + " entries");
      var lastN = entries.slice(-15);
      for (var k = 0; k < lastN.length; k++) {
        var e = lastN[k];
        if (e.chunk && e.chunk.length > 5) {
          var garbled = /[褰鈥睍]/.test(e.chunk);
          var chinese = /[\u4e00-\u9fff]/.test(e.chunk);
          console.log("  [" + (e.stream || "?") + "] garbled=" + garbled + " chinese=" + chinese + " len=" + e.chunk.length);
          console.log("  Chunk: " + e.chunk.substring(0, 300));
        }
      }
    } else {
      console.log("  Log error: " + logRes.status);
    }
  }
  process.exit(0);
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
