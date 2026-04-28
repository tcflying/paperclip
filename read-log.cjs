const fs = require("fs");
const path = require("path");

var logRef = "dccefb46-6225-4fb4-92c8-969afc082740\\dd29ec24-39b2-4b13-a00d-de86a3bc9833\\86077ca2-14a8-4d39-9736-3fc5ad85fbbb.ndjson";

var storageDir = "C:\\Users\\Administrator\\.paperclip\\instances\\default\\data\\storage";
var logPath = path.join(storageDir, logRef);

console.log("Reading:", logPath);

if (!fs.existsSync(logPath)) {
  console.log("File not found!");
  console.log("Storage dir contents:");
  var companies = fs.readdirSync(storageDir);
  console.log(companies.slice(0, 5));
  process.exit(1);
}

var content = fs.readFileSync(logPath, "utf8");
console.log("File size:", content.length);

var lines = content.split("\n").filter(function(l) { return l.trim(); });
console.log("Lines:", lines.length);

var garbledChars = ["褰", "鈥", "睍", "Կ", "Ƹ", "뿪"];
var garbledCount = 0;

for (var i = 0; i < lines.length; i++) {
  try {
    var entry = JSON.parse(lines[i]);
    var chunk = entry.chunk || "";
    
    for (var gc of garbledChars) {
      if (chunk.includes(gc)) {
        garbledCount++;
        if (garbledCount <= 3) {
          console.log("\n=== GARBLED LINE " + i + " (stream=" + entry.stream + ") ===");
          console.log(chunk.substring(0, 500));
          var buf = Buffer.from(chunk, "utf8");
          console.log("HEX:", buf.slice(0, 100).toString("hex"));
        }
        break;
      }
    }
  } catch (e) {
    // skip
  }
}

console.log("\nTotal garbled lines:", garbledCount);
process.exit(0);
