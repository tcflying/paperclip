const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var companyId = "9b60bd0b-cb4e-4673-b34c-2cf4d60646ea";
  
  // 直接查 CTO agent 的 title 原始数据
  var agents = await sql`SELECT id, name, title FROM agents WHERE company_id = ${companyId} AND role = 'cto'`;
  
  for (var a of agents) {
    var title = a.title || "";
    console.log("Title raw:", title);
    console.log("Title length:", title.length);
    
    // 逐字符分析
    console.log("\nCharacters:");
    for (var i = 0; i < title.length; i++) {
      var c = title[i];
      console.log("  [" + i + "] " + c + " U+" + ("0000" + c.charCodeAt(0).toString(16).toUpperCase()).slice(-4));
    }
    
    // UTF-8 字节
    var bufUtf8 = Buffer.from(title, "utf8");
    console.log("\nUTF-8 bytes (hex):", bufUtf8.toString("hex"));
    
    // 尝试作为 GBK 解码
    try {
      var bufLatin1 = Buffer.from(title, "latin1");
      console.log("Latin-1 bytes (hex):", bufLatin1.toString("hex"));
      
      // 尝试用 GBK 解码 UTF-8 字节
      try {
        console.log("As GBK (from UTF-8 bytes):", bufUtf8.toString("gbk"));
      } catch (e) {
        console.log("As GBK failed");
      }
    } catch (e) {
      console.log("Latin-1 conversion failed:", e.message);
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
