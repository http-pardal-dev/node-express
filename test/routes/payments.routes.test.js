"use strict";

// Integration tests for the Payments routes, through the Express app with
// Supertest (no running server). The counterpart of ruby-sinatra's
// spec/routes/payments_routes_spec.rb.

const { get, post, postJson } = require("../support/helpers/request");
const { hardenedJsonEndpoint } = require("../shared/hardened-json-endpoint");
const { prisma } = require("../../config/initializers/database");

// Creates a payment through the API and returns the parsed resource.
async function createPayment(overrides = {}) {
  const res = await postJson("/payments", { amount: "99.90", ...overrides });
  expect(res.status).toBe(201);
  return res.body.payment;
}

describe("Payments requests", () => {
  it("POST /payments creates a pending payment with 201 and a Location header", async () => {
    const res = await postJson("/payments", { amount: "99.90" });

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/payments\/\d+$/);
    expect(res.body.payment.status).toBe("pending");
  });

  it("GET /payments/:id finds a payment by id", async () => {
    const payment = await createPayment({ amount: "123.45" });

    const res = await get(`/payments/${payment.id}`);

    expect(res.status).toBe(200);
    expect(res.body.payment.amount).toBe("123.45");
  });

  it("POST /payments/:id/confirm moves a pending payment to paid", async () => {
    const payment = await createPayment();

    const res = await post(`/payments/${payment.id}/confirm`);

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("paid");
  });

  it("POST /payments/:id/cancel moves a pending payment to cancelled", async () => {
    const payment = await createPayment();

    const res = await post(`/payments/${payment.id}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("cancelled");
  });

  it("POST /payments/:id/confirm refuses a payment that is not pending", async () => {
    const payment = await createPayment();
    await post(`/payments/${payment.id}/confirm`);

    const res = await post(`/payments/${payment.id}/confirm`);

    expect(res.status).toBe(409);
  });

  it("POST /payments/:id/cancel refuses a payment that is not pending", async () => {
    const payment = await createPayment();
    await post(`/payments/${payment.id}/cancel`);

    const res = await post(`/payments/${payment.id}/cancel`);

    expect(res.status).toBe(409);
  });

  it("GET /payments/:id returns 404 for a payment that does not exist", async () => {
    const res = await get("/payments/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Payment not found");
  });

  it("POST /payments returns 400 for a zero amount", async () => {
    const res = await postJson("/payments", { amount: "0" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("GET /payments filters by status", async () => {
    const payment = await createPayment();

    const res = await get("/payments?status=pending");

    expect(res.status).toBe(200);
    expect(res.body.payments.map((p) => p.id)).toContain(payment.id);
  });

  it("GET /payments returns 400 for an unknown status", async () => {
    const res = await get("/payments?status=unknown");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("status");
  });

  it("POST /payments/:id/confirm refuses a cancelled payment with 409", async () => {
    const payment = await createPayment();
    await post(`/payments/${payment.id}/cancel`);

    const res = await post(`/payments/${payment.id}/confirm`);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("cancelled");
  });

  it("POST /payments/:id/cancel refuses a paid payment with 409", async () => {
    const payment = await createPayment();
    await post(`/payments/${payment.id}/confirm`);

    const res = await post(`/payments/${payment.id}/cancel`);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("paid");
  });

  // Two requests race on the same pending payment: the conditional UPDATE makes
  // the database the judge, so one answers 200 and the other 409, whatever the
  // interleaving. Promise.all fires them together, the counterpart of the Ruby
  // suite's threads behind a barrier.
  it("lets exactly one of two concurrent transitions win", async () => {
    const payment = await createPayment();

    const [first, second] = await Promise.all([
      post(`/payments/${payment.id}/confirm`),
      post(`/payments/${payment.id}/confirm`),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(reloaded.status).toBe("paid");
  });

  it("lets exactly one of a concurrent confirm and cancel win", async () => {
    const payment = await createPayment();

    const [confirm, cancel] = await Promise.all([
      post(`/payments/${payment.id}/confirm`),
      post(`/payments/${payment.id}/cancel`),
    ]);

    expect([confirm.status, cancel.status].sort()).toEqual([200, 409]);
    const reloaded = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(["paid", "cancelled"]).toContain(reloaded.status);
  });

  hardenedJsonEndpoint({
    path: "/payments",
    validBody: { amount: "99.90" },
    send: (body) => postJson("/payments", body),
  });
});
