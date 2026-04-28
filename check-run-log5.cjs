const http = require("http");
const fs = require("fs");

function api(method, urlPath, body, cookies) {
  return new Promise(function(resolve, reject) {
    var data = body ? JSON.stringify(body) : "";
    var headers = { "Content-Type": "application/json" };
    if (cookies) headers["Cookie"] = cookies;
    var opts = { hostname: "localhost", port: 3100, path: urlPath, method: method, headers: headers };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    var req = http.request(opts, function(res) {
      var bodyData = "";
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve({ status: res.statusCode, body: bodyData }); });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  var loginRes = await api("POST", "/api/auth/sign-in/email", { email: "datobig18@gmail.com", password: "666888abc" }, null);
  var cookies = (loginRes.body ? JSON.parse(loginRes.body) : {});
  cookies = loginRes.cookies || "";
  
  var login2 = await new Promise(function(resolve, reject) {
    var data = JSON.stringify({ email: "datobig18@gmail.com", password: "666888abc" });
    var headers = { "Content-Type": "application/json", "Cookie": "" };
    var opts = { hostname: "localhost", port: 3100, path: "/api/auth/sign-in/email", method: "POST", headers: headers };
    var req = http.request(opts, function(res) {
      var bodyData = "";
      var setCookie = res.headers["set-cookie"] || [];
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve(setCookie.map(function(c) { return c.split(";")[0]; }).join("; ")); });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });

  var runId = "86077ca2-14a8-4d39-9736-3fc5ad85fbbb";
  
  var logRes = await new Promise(function(resolve, reject) {
    var headers = { "Cookie": login2 };
    var opts = { hostname: "localhost", port: 3100, path: "/api/heartbeat-runs/" + runId + "/log", method: "GET", headers: headers };
    var req = http.request(opts, function(res) {
      var bodyData = "";
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve(bodyData); });
    });
    req.on("error", reject);
    req.end();
  });
  
  var logData = JSON.parse(logRes);
  console.log("Log ref:", logData.logRef);
  console.log("Store:", logData.store);
  console.log("Content length:", (logData.content || "").length);
  
  var content = logData.content || "";
  var lines = content.split("\n").filter(function(l) { return l.trim(); });
  console.log("Lines:", lines.length);
  
  console.log("\n=== ALL LOG LINES ===");
  for (var i = 0; i < lines.length; i++) {
    try {
      var entry = JSON.parse(lines[i]);
      var chunk = entry.chunk || "";
      if (chunk.length > 0) {
        console.log("\n[" + i + "] stream=" + entry.stream + " len=" + chunk.length);
        console.log(chunk.substring(0, 300));
      }
    } catch (e) {
      console.log("\n[" + i + "] PARSE ERROR:", lines[i].substring(0, 200));
    }
  }
  
  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
