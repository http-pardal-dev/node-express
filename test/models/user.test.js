"use strict";

// Unit tests for the User model (src/models/user.js). These specs document what
// the model accepts, so a change that tightens a rule has to show itself here
// first. The counterpart of ruby-sinatra's spec/models/user_spec.rb.
//
// Validation is a pure function that returns an array of human-readable
// messages (empty when valid), except the email uniqueness check, which reads
// the database — so `email` cases run against storage/test.sqlite3.

const prisma = require("../../src/prisma");
const { User } = require("../../src/models");

// The smallest valid user: name, email and password decide validity, and the
// remaining attributes fall back to their defaults.
function buildUser(overrides = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "secret123",
    ...overrides,
  };
}

// Runs the create validation and returns the messages (empty when valid).
const validate = (attributes) => User.validate(attributes, { isCreate: true });

describe("User.validate", () => {
  it("is valid with name, email and password", async () => {
    expect(await validate(buildUser())).toEqual([]);
  });

  it("requires a name", async () => {
    const errors = await validate(buildUser({ name: null }));
    expect(errors).toContain("Name can't be blank");
  });

  it("requires an email", async () => {
    const errors = await validate(buildUser({ email: null }));
    expect(errors).toContain("Email can't be blank");
  });

  it("rejects a duplicated email", async () => {
    await prisma.user.create({
      data: { name: "Ada", email: "ada@example.com", passwordDigest: "x", role: "user", active: true },
    });

    const errors = await validate(buildUser({ name: "Grace Hopper" }));
    expect(errors).toContain("Email has already been taken");
  });

  it("rejects an email longer than 254 characters", async () => {
    const errors = await validate(buildUser({ email: `${"a".repeat(250)}@x.com` }));
    expect(errors.some((m) => m.startsWith("Email is too long"))).toBe(true);
  });

  it("rejects an email without a domain dot", async () => {
    const errors = await validate(buildUser({ email: "ada@localhost" }));
    expect(errors).toContain("Email is invalid");
  });

  it("rejects a short password", async () => {
    const errors = await validate(buildUser({ password: "short" }));
    expect(errors.some((m) => m.startsWith("Password is too short"))).toBe(true);
  });

  it("rejects a role outside the allowlist", async () => {
    const errors = await validate(buildUser({ role: "superadmin" }));
    expect(errors).toContain("Role is not included in the list");
  });

  it("rejects a birthdate that is not a real date", async () => {
    const errors = await validate(buildUser({ birthdate: "not-a-date" }));
    expect(errors).toContain("Birthdate must be a valid date in YYYY-MM-DD format");
  });

  it("rejects an impossible birthdate", async () => {
    const errors = await validate(buildUser({ birthdate: "2000-13-40" }));
    expect(errors).toContain("Birthdate must be a valid date in YYYY-MM-DD format");
  });

  it("rejects a birthdate in the future", async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const errors = await validate(buildUser({ birthdate: tomorrow }));
    expect(errors.some((m) => m.startsWith("Birthdate must be less than or equal"))).toBe(true);
  });

  it("accepts a valid birthdate", async () => {
    expect(await validate(buildUser({ birthdate: "2000-01-01" }))).toEqual([]);
  });
});

describe("User.normalizeEmail", () => {
  it("strips and downcases the email", () => {
    expect(User.normalizeEmail("  Ada@Example.COM  ")).toBe("ada@example.com");
  });
});

describe("User.buildData", () => {
  it("hashes the password into a digest and never keeps the plain text", async () => {
    const data = await User.buildData(buildUser());
    expect(data.passwordDigest).toBeDefined();
    expect(data.passwordDigest).not.toBe("secret123");
    expect(data).not.toHaveProperty("password");
  });

  it("turns an ISO birthdate into a UTC-midnight Date", async () => {
    const data = await User.buildData(buildUser({ birthdate: "1815-12-10" }));
    expect(data.birthdate.toISOString()).toBe("1815-12-10T00:00:00.000Z");
  });
});

describe("User.toJson", () => {
  it("exposes only the public attributes and never the digest", async () => {
    const stored = await prisma.user.create({
      data: { name: "Ada", email: "ada@example.com", passwordDigest: "digest", role: "user", active: true },
    });

    const json = User.toJson(stored);
    expect(Object.keys(json).sort()).toEqual([...User.PUBLIC_ATTRIBUTES].sort());
    expect(json).not.toHaveProperty("password_digest");
    expect(json).not.toHaveProperty("passwordDigest");
  });
});
