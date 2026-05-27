const { execSync } = require("child_process");

function kill(port) {
  try {
    const pid = execSync(`lsof -ti:${port} 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    if (pid) {
      execSync(`kill -9 ${pid} 2>/dev/null`);
      console.log(`Killed process on port ${port} (PID ${pid})`);
    }
  } catch {}
}

console.log("=== Stopping kabSUBO Development Servers ===");

kill(3000);
kill(3001);
kill(8080);

try {
  execSync("pkill -f 'next dev' 2>/dev/null", { encoding: "utf-8" });
  execSync("pkill -f 'next-server' 2>/dev/null", { encoding: "utf-8" });
} catch {}

console.log("Done");
