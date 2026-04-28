const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 查最新的 issues
  var issues = await sql`SELECT identifier, title, created_at FROM issues WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 5`;
  console.log("Recent issues:");
  for (var issue of issues) {
    var title = issue.title || "";
    var garbled = title.indexOf("\ufffd") >= 0 || /[ȫԶͼƣάϵ]/.test(title);
    console.log("  " + issue.identifier + " at " + issue.created_at + " garbled=" + garbled + ": " + title.substring(0, 80));
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
