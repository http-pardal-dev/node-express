"use strict";

// Integration tests for the Users routes, through the Express app with
// Supertest (no running server). These request specs document the HTTP
// contract: status codes, response shapes and headers. The counterpart of
// ruby-sinatra's spec/routes/users_routes_spec.rb.

const { get, del, postJson, putJson, patchJson } = require("../support/helpers/request");
const { hardenedJsonEndpoint } = require("../shared/hardened-json-endpoint");

// The smallest valid user body: name, email and password decide validity.
function userBody(overrides = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "secret123",
    role: "user",
    ...overrides,
  };
}

// Creates a user through the API and returns the parsed resource: the response
// wraps it in a "user" key.
async function createUser(overrides = {}) {
  const res = await postJson("/users", userBody(overrides));
  expect(res.status).toBe(201);
  return res.body.user;
}

describe("Users requests", () => {
  it("POST /users creates a user with 201 and a Location header", async () => {
    const res = await postJson("/users", userBody());

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/users\/\d+$/);
    expect(res.body.user.name).toBe("Ada Lovelace");
    expect(res.body.user).not.toHaveProperty("password_digest");
  });

  it("GET /users/:id finds a user by id", async () => {
    const user = await createUser();

    const res = await get(`/users/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada Lovelace");
  });

  it("GET /users lists users", async () => {
    await createUser();

    const res = await get("/users");

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it("PUT /users/:id updates a user", async () => {
    const user = await createUser();

    const res = await putJson(`/users/${user.id}`, {
      name: "Ada King",
      email: user.email,
      role: "admin",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada King");
    expect(res.body.user.role).toBe("admin");
  });

  it("PATCH /users/:id partially updates a user", async () => {
    const user = await createUser();

    const res = await patchJson(`/users/${user.id}`, { name: "Ada L. King" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada L. King");
  });

  it("DELETE /users/:id removes a user with 204", async () => {
    const user = await createUser();

    const res = await del(`/users/${user.id}`);

    expect(res.status).toBe(204);
  });

  // 999999 is a well formed id that no record can have here (ids start at 1),
  // so the address is right and only the record is missing: that is a 404.
  it("GET /users/:id returns 404 for a user that does not exist", async () => {
    const res = await get("/users/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("POST /users returns 400 for a user without a name", async () => {
    const res = await postJson("/users", userBody({ name: null }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("POST /users returns 400 for a duplicated email", async () => {
    await createUser();
    const res = await postJson("/users", userBody({ name: "Grace Hopper" }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("GET /users/abc returns 400 for an invalid id", async () => {
    const res = await get("/users/abc");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid id");
  });

  it("POST /users normalizes the email", async () => {
    const res = await postJson("/users", userBody({ email: "  Ada@Example.COM  " }));

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ada@example.com");
  });

  it("PUT /users/:id requires the full resource", async () => {
    const user = await createUser();

    const res = await putJson(`/users/${user.id}`, { name: "Ada King" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("PUT /users/:id replaces the resource", async () => {
    const user = await createUser();

    const res = await putJson(`/users/${user.id}`, {
      name: "Ada King",
      email: user.email,
      role: "admin",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada King");
    expect(res.body.user.role).toBe("admin");
  });

  // The same four guarantees every resource's create endpoint shares (see
  // test/shared/hardened-json-endpoint.js).
  hardenedJsonEndpoint({
    path: "/users",
    validBody: userBody({ email: "hardened@example.com" }),
    send: (body) => postJson("/users", body),
  });
});

