import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    ...options,
  });

  return {
    ...result,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function printOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function deployMigrations() {
  const result = run("npm", ["run", "db:deploy"]);
  printOutput(result);
  return result;
}

function resetLocalSchema() {
  const sql = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
`;

  const result = run(
    "npx",
    ["prisma", "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
    {
      input: sql,
    },
  );

  printOutput(result);

  if (result.status !== 0) {
    throw new Error("Failed to reset the local PostgreSQL schema.");
  }
}

const deployResult = deployMigrations();

if (deployResult.status === 0) {
  process.exit(0);
}

const combinedOutput = `${deployResult.stdout}\n${deployResult.stderr}`;
const shouldReset =
  process.env.PRISMA_DEV_RESET_ON_P3005 === "true" &&
  combinedOutput.includes("P3005");

if (!shouldReset) {
  process.exit(deployResult.status ?? 1);
}

console.log(
  "Detected a legacy local database without Prisma migration history. Resetting the local development schema and retrying migrations.",
);

resetLocalSchema();

const retryResult = deployMigrations();
process.exit(retryResult.status ?? 1);
