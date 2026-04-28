var execSync = require('child_process').execSync;
console.log('Process chcp:', execSync('chcp').toString().trim());
console.log('Process LANG:', process.env.LANG);
console.log('Process LC_ALL:', process.env.LC_ALL);

var spawn = require('child_process').spawn;
var child = spawn('cmd', ['/c', 'chcp'], { stdio: 'pipe' });
child.stdout.setEncoding('utf8');
child.stdout.on('data', function(d) { console.log('Child chcp:', d.trim()); });
child.stderr.on('data', function(d) { console.log('Child stderr:', d.trim()); });
child.on('close', function() { process.exit(0); });
