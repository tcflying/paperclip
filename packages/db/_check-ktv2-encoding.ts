import postgres from "postgres";

const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companies = await sql`SELECT id FROM companies WHERE name ILIKE '%KTV%' LIMIT 1`;
  
  if (companies.length > 0) {
    const companyId = companies[0].id;
    
    const issue = await sql`
      SELECT id FROM issues WHERE company_id = ${companyId} AND identifier = 'KTV-2'
    `;
    
    if (issue.length > 0) {
      const issueId = issue[0].id;
      
      const comments = await sql`
        SELECT id, body, created_at 
        FROM issue_comments 
        WHERE issue_id = ${issueId}
        ORDER BY created_at ASC
      `;
      
      console.log("Total comments:", comments.length);
      
      // 找到有乱码的评论
      const garbled = comments.find(c => (c.body || '').includes('???'));
      if (garbled) {
        console.log("\n=== Garbled Comment Found ===");
        console.log("ID:", garbled.id);
        console.log("Created:", garbled.created_at);
        console.log("\nRaw body length:", garbled.body?.length);
        console.log("\nFirst 500 chars:", garbled.body?.substring(0, 500));
        
        // 检查是否包含UTF-8替换字符
        const buffer = Buffer.from(garbled.body || '', 'utf8');
        console.log("\nBuffer length:", buffer.length);
        
        // 尝试用GBK解码看是否正常
        try {
          const gbkBuffer = Buffer.from(garbled.body || '', 'binary');
          console.log("\nGBK decoded (first 200):", gbkBuffer.toString('gbk').substring(0, 200));
        } catch(e) {
          console.log("GBK decode failed");
        }
      }
    }
  }
  
  await sql.end();
}
main().catch(console.error);
