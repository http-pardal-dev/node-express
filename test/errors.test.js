"use strict";

// Protocol-level tests: unknown routes, unsupported methods, malformed requests
// and unexpected failures. These specs pin down the HTTP contract every resource
// inherits: 404 for what does not exist, 405 for what exists under another verb,
// 400 for what the server cannot parse, and 500 without internals for what the
// server did not expect. The counterpart of ruby-sinatra's spec/errors_spec.rb.

const { get, post, put, del, postJson } = require("./support/helpers/request");
const { prisma } = require("../config/initializers/database");

describe("HTTP protocol", () => {
  it("GET /nope returns 404 for a route that does not exist", async () => {
    const res = await get("/nope");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Resource not found");
  });

  it("DELETE /products/:id returns 405 with an Allow header", async () => {
    const created = await postJson("/products", {
      name: "Webcam",
      category: "video",
      price: "180.00",
    });
    const productId = created.body.product.id;

    const res = await del(`/products/${productId}`);

    expect(res.status).toBe(405);
    expect(res.body.error).toBe("Method not allowed");
    expect(res.headers.allow).toContain("GET");
    expect(res.headers.allow).toContain("PATCH");
    expect(res.body.allow).toBe(res.headers.allow);
  });

  it("PUT /payments/:id/confirm returns 405 with an Allow header", async () => {
    const created = await postJson("/payments", { amount: "10.00" });
    const paymentId = created.body.payment.id;

    const res = await put(`/payments/${paymentId}/confirm`).set("Content-Type", "application/json").send({});

    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain("POST");
  });

  it("POST /users returns 400 for invalid JSON", async () => {
    const res = await post("/users").set("Content-Type", "application/json").send("{invalid");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid JSON");
  });

  // A bug in the route: the handler reaches the 500 path. The client only gets
  // the generic message, never the internal detail ("boom").
  it("answers 500 without internals on an unexpected failure", async () => {
    jest.spyOn(prisma.user, "findMany").mockRejectedValueOnce(new Error("boom"));

    const res = await get("/users");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(JSON.stringify(res.body)).not.toContain("boom");
  });

  // A uniqueness race that slips between the check and the insert reaches the
  // database (Prisma P2002 on a unique key) and is turned into a 409.
  it("answers 409 on a uniqueness race that reaches the database", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
    jest.spyOn(prisma.user, "create").mockRejectedValueOnce({ code: "P2002" });

    const res = await postJson("/users", {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secret123",
    });

    expect(res.status).toBe(409);
  });

  // The allowlist rejects an unexpected attribute before it reaches the model,
  // so an unknown field is a 400 naming it, never a silent success.
  it("answers 400 on an unknown attribute", async () => {
    const res = await postJson("/users", {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secret123",
      hacker: "nope",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Unknown fields");
    expect(res.body.messages[0]).toContain("hacker");
  });

  it("answers every response as JSON", async () => {
    const res = await get("/nope");

    expect(res.headers["content-type"]).toContain("application/json");
  });
});
