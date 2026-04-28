const http = require("http");

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

async function main() {
  const config = await get(`http://localhost:3100/api/instance/settings/experimental`);
  console.log("=== Experimental Settings ===");
  console.log("Status:", config.status);
  console.log(config.body);
  
  const general = await get(`http://localhost:3100/api/instance/settings/general`);
  console.log("\n=== General Settings ===");
  console.log("Status:", general.status);
  console.log(general.body);
}
main().catch(console.error);