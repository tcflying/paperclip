const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var issues = await sql`SELECT id, identifier, title, description FROM issues WHERE identifier = 'CMPA-16'`;
  
  for (var issue of issues) {
    var title = issue.title || "";
    var desc = issue.description || "";
    
    console.log("=== Title ===");
    console.log("Length:", title.length);
    console.log("UTF8 bytes:", Buffer.from(title, "utf8").toString("hex"));
    
    console.log("\n=== Description ===");
    console.log("Length:", desc.length);
    console.log("UTF8 bytes:", Buffer.from(desc, "utf8").toString("hex"));
    
    // 逐字符分析前20个
    console.log("\n=== Title chars ===");
    for (var i = 0; i < Math.min(title.length, 20); i++) {
      console.log("  [" + i + "] U+" + ("0000" + title.charCodeAt(i).toString(16).toUpperCase()).slice(-4) + " " + title[i]);
    }
    
    console.log("\n=== Description chars ===");
    for (var i = 0; i < Math.min(desc.length, 20); i++) {
      console.log("  [" + i + "] U+" + ("0000" + desc.charCodeAt(i).toString(16).toUpperCase()).slice(-4) + " " + desc[i]);
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
