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
  const companies = await get("http://localhost:3100/api/companies");
  console.log("=== Companies ===");
  console.log("Status:", companies.status);
  try {
    const list = JSON.parse(companies.body);
    const cmpaaa = list.find(c => c.name && c.name.includes("CMPAAA"));
    if (cmpaaa) {
      console.log("CMPAAA company:", JSON.stringify(cmpaaa, null, 2));
      
      const agents = await get(`http://localhost:3100/api/companies/${cmpaaa.id}/agents`);
      console.log("\n=== Agents ===");
      console.log("Status:", agents.status);
      console.log(JSON.stringify(JSON.parse(agents.body), null, 2));
    }
  } catch(e) { 
    console.log("Error:", e.message); 
    console.log(companies.body.substring(0, 500));
  }
}
main().catch(console.error);
