"use strict";

// Unit tests for the Payment model (src/models/payment.js). The counterpart of
// ruby-sinatra's spec/models/payment_spec.rb. Validation is pure; the lifecycle
// transition reads and writes the database, so those cases run against
// storage/test.sqlite3.

const { prisma } = require("../../config/initializers/database");
const { Payment } = require("../../src/models");

// A pending payment: only amount is sent, status is server-owned.
async function createPayment(amount = "99.90") {
  return prisma.payment.create({ data: Payment.buildData({ amount }) });
}

describe("Payment.validate", () => {
  it("is valid with an amount", () => {
    expect(Payment.validate({ amount: "99.90" })).toEqual([]);
  });

  it("rejects a zero amount", () => {
    expect(Payment.validate({ amount: "0" }).length).toBeGreaterThan(0);
  });

  it("rejects a negative amount", () => {
    expect(Payment.validate({ amount: "-5" }).length).toBeGreaterThan(0);
  });

  it("rejects an amount above the column capacity", () => {
    expect(Payment.validate({ amount: "100000000" }).length).toBeGreaterThan(0);
  });

  it("accepts the highest storable amount", () => {
    expect(Payment.validate({ amount: "99999999.99" })).toEqual([]);
  });
});

describe("Payment constants", () => {
  it("starts as pending by default", () => {
    expect(Payment.DEFAULT_STATUS).toBe("pending");
  });

  it("lists exactly the reachable states", () => {
    expect(Payment.STATUSES).toEqual(["pending", "paid", "cancelled"]);
  });
});

describe("Payment.transition", () => {
  it("moves a pending payment to paid", async () => {
    const payment = await createPayment();

    expect(await Payment.transition(payment.id, "paid")).toBe(true);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("paid");
  });

  it("moves a pending payment to cancelled", async () => {
    const payment = await createPayment();

    expect(await Payment.transition(payment.id, "cancelled")).toBe(true);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("cancelled");
  });

  it("refuses to move a paid payment", async () => {
    const payment = await createPayment();
    await Payment.transition(payment.id, "paid");

    expect(await Payment.transition(payment.id, "cancelled")).toBe(false);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("paid");
  });

  it("refuses to move a cancelled payment", async () => {
    const payment = await createPayment();
    await Payment.transition(payment.id, "cancelled");

    expect(await Payment.transition(payment.id, "paid")).toBe(false);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("cancelled");
  });

  it("returns false for a payment that does not exist", async () => {
    expect(await Payment.transition(999999, "paid")).toBe(false);
  });

  // The state is part of the UPDATE, so the second transition matches no row
  // and reports that it changed nothing — which is what keeps one payment from
  // being confirmed twice.
  it("lets only the first of two transitions on the same payment win", async () => {
    const payment = await createPayment();

    const first = await Payment.transition(payment.id, "paid");
    const second = await Payment.transition(payment.id, "paid");

    expect([first, second]).toEqual([true, false]);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("paid");
  });

  // A confirm and a cancel on the same payment: it leaves "pending" once, so
  // only one of the two can hold.
  it("lets only one of a confirm and a cancel on the same payment win", async () => {
    const payment = await createPayment();

    const confirm = await Payment.transition(payment.id, "paid");
    const cancel = await Payment.transition(payment.id, "cancelled");

    expect([confirm, cancel].filter(Boolean)).toHaveLength(1);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(["paid", "cancelled"]).toContain(reloaded.status);
  });
});

describe("Payment.toJson", () => {
  it("exposes only the public attributes and returns amount as text", () => {
    const stored = {
      id: 1,
      amount: "99.90",
      status: "pending",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const json = Payment.toJson(stored);
    expect(Object.keys(json).sort()).toEqual([...Payment.PUBLIC_ATTRIBUTES].sort());
    expect(json.amount).toBe("99.9");
  });
});
