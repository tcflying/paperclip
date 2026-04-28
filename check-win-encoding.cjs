const { execSync } = require('child_process');
const LOG = msg => console.log(msg);

try {
  const chcp = execSync('chcp').toString().trim();
  LOG('chcp: ' + chcp);
} catch(e) {
  LOG('chcp failed: ' + e.message);
}

try {
  const locale = execSync('powershell -Command "[System.Globalization.CultureInfo]::CurrentCulture.Name').toString().trim();
  LOG('Culture: ' + locale);
} catch(e) {
  LOG('Locale failed: ' + e.message);
}

try {
  const encoding = execSync('powershell -Command "[System.Console]::OutputEncoding.WebName').toString().trim();
  LOG('ConsoleOutputEncoding: ' + encoding);
} catch(e) {
  LOG('Encoding failed: ' + e.message);
}

try {
  const utf8beta = execSync('reg query "HKCU\\Control Panel\\International" /v LocaleName 2>nul').toString().trim();
  LOG('LocaleName reg: ' + utf8beta);
} catch(e) {
  LOG('reg failed: ' + e.message);
}

LOG('process.stdout.encoding: ' + process.stdout.encoding);
LOG('process.version: ' + process.version);
LOG('process.platform: ' + process.platform);
