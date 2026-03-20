import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const printerCount = await prisma.printer.count();

  if (printerCount === 0) {
    console.log("Database is empty. Running seed.");
    execSync("npm run db:seed", { stdio: "inherit" });
  } else {
    console.log(`Database already has ${printerCount} printer record(s). Skipping seed.`);
  }
} finally {
  await prisma.$disconnect();
}
