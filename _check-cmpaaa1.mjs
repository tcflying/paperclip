import postgres from "postgres";
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip");

async function main() {
  const companyId = "dccefb46-6225-4fb4-92c8-969afc082740";
  
  const issue = await sql`SELECT id, identifier, title, status FROM issues WHERE company_id = ${companyId} AND identifier = 'CMPAAA-1'`;
  console.log("CMPAAA-1 Issue:", JSON.stringify(issue, null, 2));

  if (issue.length > 0) {
    const issueId = issue[0].id;
    
    const comments = await sql`SELECT id, body, created_at FROM issue_comments WHERE issue_id = ${issueId} ORDER BY created_at ASC`;
    console.log("\nComments count:", comments.length);
    
    for (const c of comments) {
      console.log(`\n--- Comment ${c.id.substring(0,8)} ---`);
      console.log(c.body?.substring(0, 800));
    }
  }

  await sql.end();
}
main().catch(console.error);
