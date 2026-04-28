const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  const garbledRuns = ["d000bbed", "19ff63dc", "757af406"];
  
  for (const runIdPrefix of garbledRuns) {
    const runs = await sql`SELECT id, agent_id, status, result_json, stdout_excerpt, created_at FROM heartbeat_runs WHERE id::text LIKE ${runIdPrefix + '%'}`;
    if (runs.length === 0) { console.log("No run for", runIdPrefix); continue; }
    const run = runs[0];
    console.log("\n========================================");
    console.log("Run:", run.id, "at", run.created_at.toISOString());
    
    const rj = run.result_json || {};
    console.log("\nresult_json keys:", Object.keys(rj).join(", "));
    console.log("summary:", JSON.stringify(rj.summary).substring(0, 500));
    if (rj.result) console.log("result:", JSON.stringify(rj.result).substring(0, 500));
    
    console.log("\nstdout_excerpt (first 1000):");
    console.log((run.stdout_excerpt || "").substring(0, 1000));
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
