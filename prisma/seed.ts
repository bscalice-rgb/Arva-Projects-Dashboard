import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@arvaintelligence.com";

async function main() {
  console.log("Seeding…");

  // Admin user (ownership seam).
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { id: ADMIN_USER_ID, email: ADMIN_EMAIL, name: "Admin" },
  });

  // 2026 program year (active).
  const season = await prisma.season.upsert({
    where: { year: 2026 },
    update: { isActive: true },
    create: { year: 2026, label: "2026 Program Year", isActive: true },
  });

  // ---- Sample Channel Partner: KSMJ (Indonesia) with rev-share example ----
  let ksmj = await prisma.channelPartner.findFirst({
    where: { entityName: "KSMJ", userId: user.id },
  });
  if (!ksmj) {
    ksmj = await prisma.channelPartner.create({
      data: {
        entityName: "KSMJ",
        mainContact: "Program Lead",
        type: "CHANNEL_PARTNER",
        country: "IDN",
        notes: "Sample CP carried from spreadsheet workflow.",
        userId: user.id,
      },
    });
  }

  const ksmjSeason = await prisma.channelPartnerSeason.upsert({
    where: {
      channelPartnerId_seasonId: {
        channelPartnerId: ksmj.id,
        seasonId: season.id,
      },
    },
    update: {},
    create: {
      channelPartnerId: ksmj.id,
      seasonId: season.id,
      agreementSigned: true,
      w8Provided: true,
      bankDetails: false,
    },
  });

  // Rev-share: CP at 6% + two Referrers at 3% each on the grower-payment pool.
  const existingPayees = await prisma.revenueSharePayee.count({
    where: { channelPartnerSeasonId: ksmjSeason.id },
  });
  if (existingPayees === 0) {
    await prisma.revenueSharePayee.createMany({
      data: [
        {
          channelPartnerSeasonId: ksmjSeason.id,
          name: "KSMJ",
          payeeType: "CP",
          basis: "PERCENTAGE",
          rate: 0.06,
        },
        {
          channelPartnerSeasonId: ksmjSeason.id,
          name: "Referrer A",
          payeeType: "REFERRER",
          basis: "PERCENTAGE",
          rate: 0.03,
        },
        {
          channelPartnerSeasonId: ksmjSeason.id,
          name: "Referrer B",
          payeeType: "REFERRER",
          basis: "PERCENTAGE",
          rate: 0.03,
        },
      ],
    });
  }

  // Org Node for the CP.
  let ksmjOrg = await prisma.orgNode.findFirst({
    where: { name: "KSMJ Org Node", userId: user.id },
  });
  if (!ksmjOrg) {
    ksmjOrg = await prisma.orgNode.create({
      data: {
        name: "KSMJ Org Node",
        kind: "CHANNEL_PARTNER",
        country: "IDN",
        channelPartnerId: ksmj.id,
        userId: user.id,
      },
    });
  }

  // A palm mill for Indonesia.
  let mill = await prisma.mill.findFirst({
    where: { name: "Sample Palm Refinery", userId: user.id },
  });
  if (!mill) {
    mill = await prisma.mill.create({
      data: {
        name: "Sample Palm Refinery",
        crop: "AFRICAN_OIL_PALM",
        country: "IDN",
        region: "Riau",
        userId: user.id,
      },
    });
  }

  // Sample regions (managed list; dropdowns adapt by country).
  const riau = await prisma.region.upsert({
    where: {
      userId_country_name: { userId: user.id, country: "IDN", name: "Riau" },
    },
    update: {},
    create: { userId: user.id, country: "IDN", name: "Riau" },
  });
  const buenosAires = await prisma.region.upsert({
    where: {
      userId_country_name: {
        userId: user.id,
        country: "ARG",
        name: "Buenos Aires",
      },
    },
    update: {},
    create: { userId: user.id, country: "ARG", name: "Buenos Aires" },
  });

  // A couple of clients under the CP org node.
  const clientData = [
    { name: "Grower Co-op North", legalEntity: "Grower Co-op North Pte Ltd" },
    { name: "Grower Co-op South", legalEntity: "Grower Co-op South Pte Ltd" },
  ];
  for (const c of clientData) {
    let client = await prisma.client.findFirst({
      where: { name: c.name, orgNodeId: ksmjOrg.id },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          orgNodeId: ksmjOrg.id,
          name: c.name,
          legalEntity: c.legalEntity,
          country: "IDN",
          defaultCrops: ["AFRICAN_OIL_PALM"],
          millId: mill.id,
          regions: { connect: { id: riau.id } },
          userId: user.id,
        },
      });
    }
    await prisma.clientSeason.upsert({
      where: { clientId_seasonId: { clientId: client.id, seasonId: season.id } },
      update: {},
      create: {
        clientId: client.id,
        seasonId: season.id,
        crops: ["AFRICAN_OIL_PALM"],
        enrolledHectares: 1200,
        enrolledAcres: 2965,
        legalEntitySetup: true,
        dataStatus: "IN_PROGRESS",
        fieldRequested: true,
      },
    });
  }

  // ---- Sample direct grower ----
  let directOrg = await prisma.orgNode.findFirst({
    where: { name: "Estancia Verde (Direct)", userId: user.id },
  });
  if (!directOrg) {
    directOrg = await prisma.orgNode.create({
      data: {
        name: "Estancia Verde (Direct)",
        kind: "DIRECT_GROWER",
        country: "ARG",
        userId: user.id,
      },
    });
  }
  let directClient = await prisma.client.findFirst({
    where: { name: "Estancia Verde", orgNodeId: directOrg.id },
  });
  if (!directClient) {
    directClient = await prisma.client.create({
      data: {
        orgNodeId: directOrg.id,
        name: "Estancia Verde",
        legalEntity: "Estancia Verde S.A.",
        country: "ARG",
        defaultCrops: ["SOYBEANS", "CORN"],
        regions: { connect: { id: buenosAires.id } },
        userId: user.id,
      },
    });
  }
  await prisma.clientSeason.upsert({
    where: {
      clientId_seasonId: { clientId: directClient.id, seasonId: season.id },
    },
    update: {},
    create: {
      clientId: directClient.id,
      seasonId: season.id,
      crops: ["SOYBEANS", "CORN"],
      enrolledHectares: 800,
      enrolledAcres: 1977,
      boundariesStatus: "DONE",
      dataStatus: "DONE",
      legalEntitySetup: true,
      fieldRequested: true,
      qaqc: "DONE",
      fieldConfirmed: true,
      deliveredHectares: 780,
      deliveredAcres: 1927,
    },
  });

  // ---- Sample supply shed target ----
  const shedExists = await prisma.supplyShed.findFirst({
    where: {
      seasonId: season.id,
      channelPartnerId: ksmj.id,
      crop: "AFRICAN_OIL_PALM",
      country: "IDN",
      regionId: riau.id,
    },
  });
  if (!shedExists) {
    await prisma.supplyShed.create({
      data: {
        seasonId: season.id,
        country: "IDN",
        channelPartnerId: ksmj.id,
        crop: "AFRICAN_OIL_PALM",
        regionId: riau.id,
        acresNeeded: 10000,
        hectaresNeeded: 4047,
        userId: user.id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
