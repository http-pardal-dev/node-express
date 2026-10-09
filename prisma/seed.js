// Seeds: populates the database with the same fixtures as ruby-sinatra
// (see ruby-sinatra/db/seeds/*.yml).
//
//   npm run db:seed    # loads users, products and payments
//
// The loader is idempotent, so re-running it keeps the existing records
// instead of creating duplicates:
//   - users: matched by email (stripped and downcased, like the model);
//   - products: matched by name;
//   - payments: matched by amount; status is only applied on creation (a
//     payment created pending is moved once), so a payment the user confirmed
//     or cancelled through the API is never moved back.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// The smallest shared password, hashed with bcrypt exactly like the original
// (has_secure_password). Every seeded user shares it.
const SEED_PASSWORD = "secret123";

const USERS = [
  { name: "Ada Lovelace", email: "ada@example.com", role: "admin", birthdate: "1815-12-10", active: true },
  { name: "Alan Turing", email: "alan@example.com", role: "user", birthdate: "1912-06-23", active: true },
  { name: "Grace Hopper", email: "grace@example.com", role: "user", birthdate: "1906-12-09", active: false },
];

const PRODUCTS = [
  { name: "Keyboard", description: "Mechanical keyboard", category: "peripherals", price: "159.90" },
  { name: "Mouse", description: "Wireless mouse", category: "peripherals", price: "89.90" },
  { name: "Laptop Stand", description: "Aluminum stand", category: "accessories", price: "129.00" },
];

const PAYMENTS = [
  { amount: "99.90", status: "pending" },
  { amount: "123.45", status: "paid" },
  { amount: "50.00", status: "cancelled" },
];

async function loadUsers(passwordDigest) {
  let created = 0;
  for (const user of USERS) {
    const email = user.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;

    await prisma.user.create({
      data: {
        name: user.name,
        email,
        passwordDigest,
        role: user.role,
        active: user.active,
        birthdate: new Date(`${user.birthdate}T00:00:00.000Z`),
      },
    });
    created += 1;
  }
  return created;
}

async function loadProducts() {
  let created = 0;
  for (const product of PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) continue;

    await prisma.product.create({ data: product });
    created += 1;
  }
  return created;
}

async function loadPayments() {
  let created = 0;
  for (const payment of PAYMENTS) {
    // amount is the identity: the same decimal value matches the same record.
    const existing = await prisma.payment.findFirst({ where: { amount: payment.amount } });
    if (existing) continue;

    // status is server-owned and only applied on creation, to leave examples
    // in every state, exactly like the original seed.
    await prisma.payment.create({ data: { amount: payment.amount, status: payment.status } });
    created += 1;
  }
  return created;
}

async function main() {
  const passwordDigest = await bcrypt.hash(SEED_PASSWORD, 10);

  const users = await loadUsers(passwordDigest);
  const products = await loadProducts();
  const payments = await loadPayments();

  console.log(`Seeds loaded: ${users} user(s), ${products} product(s), ${payments} payment(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
