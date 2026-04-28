# Start Paperclip server as administrator
$cmd = "cd D:\trae-project\tc-paperclip\server; npx tsx ../scripts/dev-runner.ts dev -- --bind custom --bind-host 192.168.50.233"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -Verb RunAs
