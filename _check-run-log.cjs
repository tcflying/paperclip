const http = require("http");

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

async function main() {
  // KTV company ID
  const companyId = "e0681ee9-2dae-4ae9-8c22-735b63fe2214";
  
  // 获取最近的 runs
  const runsRes = await fetch(`http://localhost:3100/api/companies/${companyId}/heartbeat-runs?limit=5`);
  console.log("Runs status:", runsRes.status);
  
  if (runsRes.status === 200) {
    const runs = JSON.parse(runsRes.body);
    console.log("\nRecent runs:");
    for (const run of runs.slice(0, 5)) {
      console.log(`\nID: ${run.id}`);
      console.log(`Agent: ${run.agentId}`);
      console.log(`Created: ${run.createdAt}`);
      console.log(`Status: ${run.status}`);
      
      // 获取这个 run 的日志
      const logRes = await fetch(`http://localhost:3100/api/heartbeat-runs/${run.id}/log?offset=0&limitBytes=50000`);
      if (logRes.status === 200) {
        const log = JSON.parse(logRes.body);
        const hasQuestionMarks = log.log?.includes("????");
        console.log(`Log has ????: ${hasQuestionMarks}`);
        if (hasQuestionMarks) {
          console.log("\nLog last 1000 chars:");
          console.log(log.log?.substring(Math.max(0, log.log.length - 1000)));
        }
      }
    }
  }
}
main().catch(console.error);
