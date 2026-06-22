import { PrismaClient, Stage, InteractionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Seeds the first admin account (from env) plus a small set of demo sales reps,
// contacts, interactions and daily logs so the dashboards have something to show
// on first run. Safe to re-run: it upserts by unique keys.

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "jadabboud@bolldr.com").toLowerCase();
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

  // Demo prospects mirror the Bolldr CRM verticals (digital-marketing agency).
  const demoContacts = [
    { company: "Odontología Soul Dentist", industry: "Odontología", interests: ["Página Web", "Redes Sociales"] },
    { company: "Centro De Estética Castilla", industry: "Salud y Estética", interests: ["Redes Sociales", "Branding"] },
    { company: "Fisioterapia Integrativa", industry: "Salud y Estética", interests: ["SEO", "Google Ads"] },
    { company: "Spa Bienestar Total", industry: "Bienestar y Spa", interests: ["Fotografía", "Video"] },
    { company: "Pilates Studio Reforma", industry: "Pilates y Fitness", interests: ["Página Web", "Redes Sociales"] },
    { company: "AJL Abogados", industry: "Contadores", interests: ["Branding", "Consultoría"] },
    { company: "AIA Arquitectura e Ingeniería", industry: "Inmobiliaria", interests: ["Página Web", "E-Commerce"] },
    { company: "R3CO Ropa Responsable", industry: "Tecnología", interests: ["E-Commerce", "Google Ads"] },
    { company: "Centro Cultural La Candelaria", industry: "Centro Cultural", interests: ["Redes Sociales", "Video"] },
    { company: "Colegio Bilingüe Andino", industry: "Educación", interests: ["Página Web", "SEO"] },
    { company: "Clínica Dental Sonrisa", industry: "Odontología", interests: ["Automatización IA", "Análisis de Datos"] },
    { company: "Inmobiliaria Hábitat", industry: "Inmobiliaria", interests: ["Página Web", "Google Ads"] },
  ];
  const stages: Stage[] = ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  const firstNames = ["Ana", "Carlos", "Lucía", "Mateo", "Valentina", "Andrés", "Camila", "Sergio", "Paula", "Diego", "Daniela", "Felipe"];

  for (let i = 0; i < demoContacts.length; i++) {
    const owner = reps[i % reps.length];
    const stage = stages[i % stages.length];
    const d = demoContacts[i];
    const phone = `+57 30${(10000000 + i * 13577).toString().slice(0, 8)}`;
    const contact = await prisma.contact.create({
      data: {
        firstName: firstNames[i % firstNames.length],
        lastName: ["Gómez", "Rodríguez", "Martínez", "López", "Hernández"][i % 5],
        company: d.company,
        jobTitle: ["Propietario", "Gerente", "Director", "Administrador"][i % 4],
        email: `contacto${i + 1}@example.com`,
        phone,
        whatsapp: phone,
        website: `https://${d.company.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "")}.co`,
        industry: d.industry,
        interests: d.interests,
        source: ["Website", "Referral", "Cold Call", "Event", "CSV Import"][i % 5],
        stage,
        dealValue: [0, 1500, 3000, 5000, 8000, 12000][i % 6],
        city: ["Bogotá", "Medellín", "Cali"][i % 3],
        country: "Colombia",
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
            "Llamada inicial — interesados en rediseño de página web.",
            "Enviada propuesta con paquetes de redes sociales y SEO.",
            "Seguimiento: esperando decisión de la gerencia.",
            "Discutimos cronograma de branding y campañas de Google Ads.",
          ][(i + j) % 4],
          durationMinutes: j === 0 ? 15 + (i % 30) : null,
          createdAt: new Date(Date.now() - (i + j) * 43200000),
        },
      });
    }
  }
  console.log(`✔ Seeded ${demoContacts.length} demo contacts with interactions.`);

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
