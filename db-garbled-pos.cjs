const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

  const runs = await sql`SELECT id, stdout_excerpt FROM heartbeat_runs WHERE id::text LIKE 'd000bbed%'`;
  const stdout = runs[0].stdout_excerpt || "";
  
  var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
  var positions = [];
  for (var gc of garbledChars) {
    var idx = stdout.indexOf(gc);
    while (idx >= 0) {
      positions.push({ char: gc, pos: idx });
      idx = stdout.indexOf(gc, idx + 1);
    }
  }
  positions.sort(function(a, b) { return a.pos - b.pos; });
  
  console.log("Garbled char positions:", positions.length);
  for (var p of positions.slice(0, 5)) {
    console.log("\n  Char:", p.char, "at", p.pos);
    var start = Math.max(0, p.pos - 200);
    var end = Math.min(stdout.length, p.pos + 200);
    console.log("  Context: ..." + stdout.substring(start, end) + "...");
  }

  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
