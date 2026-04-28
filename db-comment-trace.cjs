const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  const issueId = "7228437f-5597-4501-b63d-96b20bf9d313";

  const comments = await sql`SELECT id, body, author_agent_id, author_user_id, created_by_run_id, created_at FROM issue_comments WHERE issue_id = ${issueId} ORDER BY created_at`;
  
  const garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪", "\ufffd"];
  
  for (const c of comments) {
    const body = c.body || "";
    let garbled = false;
    for (const gc of garbledChars) {
      if (body.includes(gc)) { garbled = true; break; }
    }
    const hasChinese = /[\u4e00-\u9fff]/.test(body);
    
    if (garbled || hasChinese) {
      console.log("\n--- Comment " + c.id.slice(0,8) + " at " + c.created_at.toISOString().substring(0,19));
      console.log("  garbled=" + garbled + " by=" + (c.author_agent_id ? "agent:" + c.author_agent_id.slice(0,8) : "user") + " run=" + (c.created_by_run_id || "none").slice(0,8));
      console.log("  TEXT: " + body.substring(0, 200));
      
      if (garbled && c.created_by_run_id) {
        const runs = await sql`SELECT id, result_json FROM heartbeat_runs WHERE id = ${c.created_by_run_id}`;
        if (runs.length > 0) {
          const rj = runs[0].result_json || {};
          const summary = rj.summary || "";
          const result = rj.result || "";
          let runGarbled = false;
          for (const gc of garbledChars) {
            if (String(summary).includes(gc) || String(result).includes(gc)) { runGarbled = true; break; }
          }
          console.log("  RUN result_json summary garbled=" + runGarbled);
          console.log("  RUN summary: " + String(summary).substring(0, 200));
        }
      }
    }
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
