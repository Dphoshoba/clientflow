import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const organizationName = process.env.SEED_ORGANIZATION_NAME?.trim() || "Pilot Agency";
  if (!email) throw new Error("Set SEED_OWNER_EMAIL before running the pilot seed.");

  const organization = await prisma.organization.upsert({
    where: { slug: slugify(organizationName) },
    update: { name: organizationName },
    create: { name: organizationName, slug: slugify(organizationName) },
  });
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.SEED_OWNER_NAME?.trim() || null },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { organizationId: organization.id, userId: user.id, role: "OWNER" },
  });

  console.log(`Pilot owner is ready for ${organization.name}. Request a sign-in link for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Pilot seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
