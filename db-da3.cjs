const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  const daId = "7ed6fcfe-3586-485b-a2bd-bf97806648ed";

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'issues' ORDER BY ordinal_position`;
  console.log("Issues columns:", cols.map(c => c.column_name).join(", "));

  const commentCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'issue_comments' ORDER BY ordinal_position`;
  console.log("Comments columns:", commentCols.map(c => c.column_name).join(", "));

  const issues = await sql`SELECT id, identifier, title, status, created_at FROM issues WHERE company_id = ${daId} ORDER BY created_at`;
  console.log("\n=== Issues ===");
  for (const issue of issues) {
    console.log("Issue " + issue.identifier + ": " + JSON.stringify(issue.title).substring(0, 150) + " status=" + issue.status);
  }

  console.log("\n=== Comments ===");
  for (const issue of issues) {
    const comments = await sql`SELECT id, body, author_agent_id, author_user_id, created_at FROM issue_comments WHERE issue_id = ${issue.id} ORDER BY created_at`;
    for (const c of comments) {
      const body = c.body || "";
      const hasChinese = /[\u4e00-\u9fff]/.test(body);
      const garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
      let garbled = false;
      for (const gc of garbledChars) {
        if (body.includes(gc)) { garbled = true; break; }
      }
      if (hasChinese || garbled) {
        const who = c.author_agent_id ? "agent:" + c.author_agent_id.slice(0,8) : (c.author_user_id ? "user:" + c.author_user_id.slice(0,8) : "unknown");
        console.log("\nIssue " + issue.identifier + " | " + who + " | " + c.created_at.toISOString().substring(0,19));
        console.log("  garbled=" + garbled + " len=" + body.length);
        console.log("  TEXT: " + body.substring(0, 400));
        if (garbled) {
          const buf = Buffer.from(body, "utf8");
          console.log("  HEX(120): " + buf.slice(0, 120).toString("hex"));
        }
      }
    }
  }

  console.log("\n=== Heartbeat Runs ===");
  const runs = await sql`SELECT id, agent_id, status, result_json, stdout_excerpt, created_at FROM heartbeat_runs WHERE company_id = ${daId} ORDER BY created_at DESC LIMIT 20`;
  const garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
  for (const run of runs) {
    const rj = run.result_json || {};
    const summary = rj.summary || "";
    const result = rj.result || "";
    let garbled = false;
    for (const gc of garbledChars) {
      if (String(summary).includes(gc) || String(result).includes(gc)) { garbled = true; break; }
    }
    const hasChinese = /[\u4e00-\u9fff]/.test(summary) || /[\u4e00-\u9fff]/.test(result);
    if (hasChinese || garbled) {
      console.log("\nRun " + run.id.slice(0,8) + " agent=" + (run.agent_id || "").slice(0,8) + " " + run.status + " " + run.created_at.toISOString().substring(0,19));
      if (summary) console.log("  summary garbled=" + garbled + ": " + String(summary).substring(0, 300));
    }
    const stdout = run.stdout_excerpt || "";
    if (stdout) {
      let stdGarbled = false;
      for (const gc of garbledChars) {
        if (stdout.includes(gc)) { stdGarbled = true; break; }
      }
      if (stdGarbled) {
        console.log("  STDOUT GARBLED: " + stdout.substring(0, 300));
        const buf = Buffer.from(stdout, "utf8");
        console.log("  STDOUT HEX(120): " + buf.slice(0, 120).toString("hex"));
      }
    }
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
