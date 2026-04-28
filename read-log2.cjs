const fs = require("fs");

var logPath = "C:\\Users\\Administrator\\.paperclip\\instances\\default\\data\\run-logs\\dccefb46-6225-4fb4-92c8-969afc082740\\dd29ec24-39b2-4b13-a00d-de86a3bc9833\\86077ca2-14a8-4d39-9736-3fc5ad85fbbb.ndjson";

var content = fs.readFileSync(logPath, "utf8");
console.log("File size:", content.length);

var lines = content.split("\n").filter(function(l) { return l.trim(); });
console.log("Lines:", lines.length);

var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
var garbledLines = [];

for (var i = 0; i < lines.length; i++) {
  try {
    var entry = JSON.parse(lines[i]);
    var chunk = entry.chunk || "";
    
    for (var gc of garbledChars) {
      if (chunk.includes(gc)) {
        garbledLines.push({ line: i, chunk: chunk, stream: entry.stream });
        break;
      }
    }
  } catch (e) {
    // skip parse errors
  }
}

console.log("\nTotal garbled lines:", garbledLines.length);

for (var j = 0; j < Math.min(garbledLines.length, 5); j++) {
  var gl = garbledLines[j];
  console.log("\n=== GARBLED LINE " + gl.line + " (stream=" + gl.stream + ") ===");
  console.log(gl.chunk.substring(0, 500));
}

process.exit(0);
