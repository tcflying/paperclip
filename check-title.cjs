const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  // 查 CMPA-42 issue 的原始标题
  var issueId = "37088c4e-f91d-4565-a2f3-18421b9b65a3"; // 从日志里找到的 CMPA-50 相关的 ancestor
  
  var issues = await sql`SELECT id, identifier, title FROM issues WHERE company_id = 'dccefb46-6225-4fb4-92c8-969afc082740' AND identifier IN ('CMPA-16', 'CMPA-42', 'CMPA-50', 'CMPA-56', 'CMPA-47', 'CMPA-51', 'CMPA-45', 'CMPA-54') ORDER BY identifier`;
  
  console.log("Issues found:", issues.length);
  for (var issue of issues) {
    var title = issue.title || "";
    console.log("\n" + issue.identifier + ":");
    console.log("  Raw:", title);
    console.log("  Length:", title.length);
    
    // 逐字符分析
    var chars = [];
    for (var i = 0; i < Math.min(title.length, 30); i++) {
      var c = title[i];
      chars.push(c + " U+" + ("0000" + c.charCodeAt(0).toString(16).toUpperCase()).slice(-4));
    }
    console.log("  Chars:", chars.join(" "));
    
    // 检测编码问题
    var hasRepl = title.indexOf("\ufffd") >= 0;
    var hasHigh = /[\u0080-\u00FF]/.test(title);
    console.log("  Has replacement char:", hasRepl, "Has Latin-1 chars:", hasHigh);
    
    // 尝试不同解码
    var buf = Buffer.from(title, "utf8");
    console.log("  UTF8 bytes (hex):", buf.slice(0, 50).toString("hex"));
    
    // 尝试 GBK 解码
    try {
      var gbk = buf.toString("latin1");
      console.log("  As Latin-1:", gbk.substring(0, 100));
    } catch (e) {}
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
