import { PrismaClient, Stage, InteractionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Seeds the first admin account (from env) plus a small set of demo sales reps,
// contacts, interactions and daily logs so the dashboards have something to show
// on first run. Safe to re-run: it upserts by unique keys.

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@bolldr.com").toLowerCase();
  const adminUsername = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Bolldr Admin";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: adminUsername,
      name: adminName,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`✔ Admin ready: ${admin.username} / ${adminEmail}`);

  // Demo sales reps (password: "password123").
  const repsData = [
    { email: "sara@bolldr.com", username: "sara", name: "Sara Khan" },
    { email: "omar@bolldr.com", username: "omar", name: "Omar Haddad" },
  ];
  const reps = [];
  for (const r of repsData) {
    const rep = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        ...r,
        role: "SALES",
        passwordHash: await bcrypt.hash("password123", 10),
      },
    });
    reps.push(rep);
  }
  console.log(`✔ ${reps.length} demo sales reps ready (password: password123)`);

  // Only seed demo contacts once.
  const existingContacts = await prisma.contact.count();
  if (existingContacts > 0) {
    console.log(`✔ ${existingContacts} contacts already present — skipping demo data.`);
    return;
  }

  const companies = [
    "Fit Gym Dubai", "PowerHouse Abu Dhabi", "FlexFit Sharjah", "IronWorks JLT",
    "PulseClub Marina", "Apex Athletics", "Zenith Wellness", "CoreStrength DIFC",
    "Velocity Sports", "Summit Fitness", "Elevate Studio", "Titan Performance",
  ];
  const stages: Stage[] = ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  const firstNames = ["Ali", "Layla", "Hassan", "Noor", "Yusuf", "Mariam", "Khalid", "Aisha", "Tariq", "Dana", "Rashid", "Hana"];

  for (let i = 0; i < companies.length; i++) {
    const owner = reps[i % reps.length];
    const stage = stages[i % stages.length];
    const contact = await prisma.contact.create({
      data: {
        firstName: firstNames[i % firstNames.length],
        lastName: ["Al Mansoori", "Saleh", "Rahman", "Aziz", "Farooq"][i % 5],
        company: companies[i],
        jobTitle: ["Owner", "Operations Manager", "Director", "GM"][i % 4],
        email: `lead${i + 1}@example.com`,
        phone: `+9715${(50000000 + i * 13577).toString().slice(0, 8)}`,
        source: ["Website", "Referral", "Cold Call", "Event", "CSV Import"][i % 5],
        stage,
        dealValue: [0, 5000, 12000, 25000, 40000, 60000][i % 6],
        city: ["Dubai", "Abu Dhabi", "Sharjah"][i % 3],
        country: "UAE",
        ownerId: owner.id,
        lastContactedAt: new Date(Date.now() - i * 86400000),
      },
    });

    // A couple of interactions per contact.
    const types: InteractionType[] = ["CALL", "EMAIL", "MEETING", "NOTE", "WHATSAPP"];
    const n = (i % 3) + 1;
    for (let j = 0; j < n; j++) {
      await prisma.interaction.create({
        data: {
          contactId: contact.id,
          userId: owner.id,
          type: types[(i + j) % types.length],
          body: [
            "Intro call — interested in annual membership package.",
            "Sent proposal with corporate pricing tiers.",
            "Follow-up: waiting on decision from management.",
            "Discussed onboarding timeline and PT add-ons.",
          ][(i + j) % 4],
          durationMinutes: j === 0 ? 15 + (i % 30) : null,
          createdAt: new Date(Date.now() - (i + j) * 43200000),
        },
      });
    }
  }
  console.log(`✔ Seeded ${companies.length} demo contacts with interactions.`);

  // Daily logs for the last 5 days for each rep.
  for (const rep of reps) {
    for (let d = 0; d < 5; d++) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - d);
      await prisma.dailyLog.upsert({
        where: { userId_date: { userId: rep.id, date } },
        update: {},
        create: {
          userId: rep.id,
          date,
          hoursWorked: 7 + (d % 3),
          callsMade: 8 + d * 2,
          meetingsHeld: d % 3,
          emailsSent: 5 + d,
          newContacts: 1 + (d % 2),
          dealsWon: d === 0 ? 1 : 0,
          summary: "Worked through follow-up list, booked two demos, advanced three deals.",
        },
      });
    }
  }
  console.log(`✔ Seeded daily logs for ${reps.length} reps.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
