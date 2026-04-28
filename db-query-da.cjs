const pg = require("pg");

async function main() {
  const client = new pg.Client({
    connectionString: "postgres://paperclip:paperclip@127.0.0.1:54329/paperclip",
  });
  await client.connect();

  const res = await client.query(
    "SELECT id, name, issue_prefix, status FROM companies WHERE issue_prefix = 'DA' OR name ILIKE '%DA%'"
  );
  console.log("DA companies:", JSON.stringify(res.rows, null, 2));

  if (res.rows.length === 0) {
    const all = await client.query("SELECT id, name, issue_prefix, status FROM companies ORDER BY created_at DESC LIMIT 5");
    console.log("\nRecent companies:");
    all.rows.forEach(function(r) {
      console.log("  " + r.name + " prefix=" + r.issue_prefix + " status=" + r.status);
    });
  }

  const da = res.rows[0];
  if (da) {
    console.log("\n=== Issues for DA ===");
    const issues = await client.query(
      "SELECT id, number, title, status FROM issues WHERE company_id = $1 ORDER BY number",
      [da.id]
    );
    issues.rows.forEach(function(issue) {
      console.log("Issue " + issue.number + ": " + JSON.stringify(issue.title) + " status=" + issue.status);
    });

    console.log("\n=== Comments for DA issues ===");
    for (const issue of issues.rows) {
      const comments = await client.query(
        "SELECT id, body, author_type, created_at FROM issue_comments WHERE issue_id = $1 ORDER BY created_at",
        [issue.id]
      );
      for (const c of comments.rows) {
        const body = c.body || "";
        const hasChinese = /[\u4e00-\u9fff]/.test(body);
        const garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪", "\ufffd"];
        let garbled = false;
        for (const gc of garbledChars) {
          if (body.includes(gc)) { garbled = true; break; }
        }
        if (hasChinese || garbled) {
          console.log("\nIssue " + issue.number + " Comment by " + c.author_type + " at " + c.created_at);
          console.log("  garbled=" + garbled + " len=" + body.length);
          console.log("  TEXT: " + body.substring(0, 300));
          if (garbled) {
            const buf = Buffer.from(body, "utf8");
            console.log("  HEX(100): " + buf.slice(0, 100).toString("hex"));
          }
        }
      }
    }

    console.log("\n=== Heartbeat runs for DA ===");
    const runs = await client.query(
      "SELECT id, agent_id, status, result_json, stdout_excerpt, created_at FROM heartbeat_runs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 15",
      [da.id]
    );
    for (const run of runs.rows) {
      const rj = run.result_json || {};
      const summary = rj.summary || "";
      const result = rj.result || "";
      let garbled = false;
      const garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪", "\ufffd"];
      for (const gc of garbledChars) {
        if (summary.includes(gc) || String(result).includes(gc)) { garbled = true; break; }
      }
      const hasChinese = /[\u4e00-\u9fff]/.test(summary) || /[\u4e00-\u9fff]/.test(result);
      if (hasChinese || garbled) {
        console.log("\nRun " + run.id.slice(0,8) + " agent=" + (run.agent_id || "").slice(0,8) + " " + run.status + " at " + run.created_at);
        if (summary) console.log("  summary garbled=" + garbled + ": " + String(summary).substring(0, 300));
        if (result && typeof result === "string") console.log("  result garbled=" + garbled + ": " + result.substring(0, 200));
      }
      const stdout = run.stdout_excerpt || "";
      if (stdout && /[\u4e00-\u9fff]/.test(stdout)) {
        let stdGarbled = false;
        for (const gc of garbledChars) {
          if (stdout.includes(gc)) { stdGarbled = true; break; }
        }
        if (stdGarbled) {
          console.log("  STDOUT garbled: " + stdout.substring(0, 300));
          const buf = Buffer.from(stdout, "utf8");
          console.log("  STDOUT HEX(100): " + buf.slice(0, 100).toString("hex"));
        }
      }
    }
  }

  await client.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
