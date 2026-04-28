const postgres = require("postgres");
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companies = await sql`SELECT id, name FROM companies WHERE name ILIKE '%KTV%' LIMIT 1`;
  console.log("KTV Company:", JSON.stringify(companies, null, 2));

  if (companies.length > 0) {
    const companyId = companies[0].id;
    
    const issues = await sql`
      SELECT id, identifier, title, company_id 
      FROM issues 
      WHERE company_id = ${companyId} AND identifier = 'KTV-2'
    `;
    console.log("\nKTV-2 Issue:", JSON.stringify(issues, null, 2));
    
    if (issues.length > 0) {
      const issueId = issues[0].id;
      
      const comments = await sql`
        SELECT id, body, created_at 
        FROM issue_comments 
        WHERE issue_id = ${issueId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log("\nKTV-2 Comments:", JSON.stringify(comments, null, 2));
      
      for (const c of comments) {
        console.log("\n--- Comment body (raw bytes sample) ---");
        const bodyBytes = Buffer.from(c.body || '', 'utf8');
        console.log("First 200 chars:", c.body?.substring(0, 200));
        console.log("Has question marks:", (c.body || '').includes('????'));
        console.log("Has correct Chinese:", /\u4e00-\u9fa5/.test(c.body || ''));
      }
    }
  }
  
  await sql.end();
}
main().catch(console.error);
