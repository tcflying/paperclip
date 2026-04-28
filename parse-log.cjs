const http = require("http");

async function login() {
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify({ email: "datobig18@gmail.com", password: "666888abc" });
    var headers = { "Content-Type": "application/json", "Cookie": "" };
    var opts = { hostname: "localhost", port: 3100, path: "/api/auth/sign-in/email", method: "POST", headers: headers };
    var req = http.request(opts, function(res) {
      var bodyData = "";
      var setCookie = res.headers["set-cookie"] || [];
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() {
        var cookies = setCookie.map(function(c) { return c.split(";")[0]; }).join("; ");
        resolve(cookies);
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function fetchLog(cookies) {
  return new Promise(function(resolve, reject) {
    var headers = { "Cookie": cookies };
    var opts = { hostname: "localhost", port: 3100, path: "/api/heartbeat-runs/86077ca2-14a8-4d39-9736-3fc5ad85fbbb/log?offset=0&limitBytes=500000", method: "GET", headers: headers };
    var req = http.request(opts, function(res) {
      var bodyData = "";
      res.on("data", function(c) { bodyData += c; });
      res.on("end", function() { resolve(JSON.parse(bodyData)); });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  var cookies = await login();
  var logData = await fetchLog(cookies);
  
  var content = logData.content || "";
  console.log("Content length:", content.length);
  
  var lines = content.split("\n").filter(function(l) { return l.trim(); });
  console.log("Lines:", lines.length);
  
  var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
  
  for (var i = 0; i < lines.length; i++) {
    try {
      var entry = JSON.parse(lines[i]);
      var chunk = entry.chunk || "";
      
      for (var gc of garbledChars) {
        if (chunk.includes(gc)) {
          console.log("\n=== GARBLED LINE " + i + " ===");
          console.log(chunk.substring(0, 500));
          var buf = Buffer.from(chunk, "utf8");
          console.log("HEX:", buf.slice(0, 100).toString("hex"));
          break;
        }
      }
    } catch (e) {
      // skip parse errors
    }
  }
  
  console.log("\n=== DONE ===");
  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
