import net from "node:net";

const timeoutMs = 60_000;
const start = Date.now();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const host = url.hostname;
const port = Number(url.port || 5432);

function waitForPort() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.on("connect", () => {
      socket.end();
      resolve();
    });

    socket.on("error", () => {
      socket.destroy();
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out waiting for PostgreSQL at ${host}:${port}`));
        return;
      }

      setTimeout(() => {
        waitForPort().then(resolve).catch(reject);
      }, 1_000);
    });
  });
}

await waitForPort();
console.log(`PostgreSQL is reachable at ${host}:${port}.`);
