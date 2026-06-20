import "dotenv/config";

const requiredUrl = process.env.DATABASE_URL;

if (!requiredUrl) {
  throw new Error("DATABASE_URL is required before running the seed script.");
}

console.log("Seed script placeholder ready for", requiredUrl.replace(/:[^:@/]+@/, ":***@"));
console.log("Add insert statements after the first migration is generated.");

