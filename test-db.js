const postgres = require('postgres');

const sql = postgres('postgres://paperclip:paperclip@127.0.0.1:54329/paperclip');

sql`SELECT 1`.then(r => {
  console.log('OK:', r);
  sql.end();
}).catch(e => {
  console.error('FAIL:', e.message);
  sql.end();
});
