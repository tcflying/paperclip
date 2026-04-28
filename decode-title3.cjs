const postgres = require("./packages/db/node_modules/postgres");

async function main() {
  const sql = postgres("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");
  
  var result = await sql`SELECT title FROM issues WHERE identifier = 'CMPAA-2'`;
  
  if (result.length > 0) {
    var title = result[0].title;
    console.log("Title:", title);
    console.log("Type:", typeof title);
    console.log("Length:", title.length);
    
    console.log("\nUnicode characters:");
    for (var i = 0; i < title.length; i++) {
      var c = title[i];
      console.log("  [" + i + "] " + c + " U+" + ("0000" + c.charCodeAt(0).toString(16).toUpperCase()).slice(-4));
    }
    
    // UTF-8 字节
    var utf8Bytes = Buffer.from(title, "utf8");
    console.log("\nUTF-8 bytes:", utf8Bytes.toString("hex"));
    
    // 尝试作为 Latin-1 单字节解读
    var latin1Bytes = Buffer.from(title, "latin1");
    console.log("Latin-1 bytes:", latin1Bytes.toString("hex"));
    
    // 如果用 Latin-1 解读 UTF-8 字节，会得到什么？
    console.log("\n=== 原始 UTF-8 字节作为 Latin-1 解读 ===");
    var asLatin1 = utf8Bytes.toString("latin1");
    console.log(asLatin1);
    
    // 如果用 Latin-1 字节作为 UTF-8 解读
    console.log("\n=== 原始 UTF-8 字节强制作为 UTF-8 解读 ===");
    for (var i = 0; i < utf8Bytes.length; i++) {
      var b = utf8Bytes[i];
      // 检查是否是有效的 UTF-8 多字节序列
      if (b >= 0x80) {
        if (b >= 0xe0) {
          // 3-byte sequence
          if (i + 2 < utf8Bytes.length) {
            console.log("  3-byte UTF-8 at " + i + ": " + utf8Bytes.slice(i, i+3).toString("hex"));
            i += 2;
          }
        } else if (b >= 0xc0) {
          // 2-byte sequence
          if (i + 1 < utf8Bytes.length) {
            console.log("  2-byte UTF-8 at " + i + ": " + utf8Bytes.slice(i, i+2).toString("hex"));
            i += 1;
          }
        }
      }
    }
  }
  
  await sql.end();
}

main().catch(function(e) { console.error(e); process.exit(1); });
