const http = require("http");

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
  console.log("Logged in");

  var daId = "7ed6fcfe-3586-485b-a2bd-bf97806648ed";
  var issueId = "7228437f-5597-4501-b63d-96b20bf9d313";
  
  var commentRes = await api("POST", "/api/companies/" + daId + "/issues/" + issueId + "/comments", { body: "用paperclip技能创建一个新的issue，标题是：测试中文招聘计划。描述用中文写。" }, cookies);
  console.log("Comment status:", commentRes.status);
  console.log("Response:", commentRes.body.substring(0, 500));
  
  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
