const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var issues = await sql`SELECT * FROM issues WHERE identifier = 'CMPAA-2'`;
  
  for (var issue of issues) {
    console.log("Keys:", Object.keys(issue).join(", "));
    
    for (var key of Object.keys(issue)) {
      var val = issue[key];
      if (typeof val === 'string' && val.length > 0 && val.length < 1000) {
        console.log("\n" + key + ":", val);
      } else if (typeof val === 'string' && val.length > 1000) {
        console.log("\n" + key + " (long):", val.substring(0, 200));
      }
    }
    
    // 检查 JSON 字段
    var metadata = issue.metadata;
    if (metadata && typeof metadata === 'object') {
      console.log("\nmetadata:", JSON.stringify(metadata).substring(0, 200));
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
