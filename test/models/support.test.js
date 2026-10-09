"use strict";

// Unit tests for the shared model helpers (src/models/support.js). These are
// pure functions with no database access, so they are the fastest specs in the
// suite: they pin down the small pieces the model validations lean on.

const {
  isBlank,
  isPresent,
  asNumber,
  isValidISODate,
  toISODate,
  formatMoney,
} = require("../../src/models/support");

describe("isBlank / isPresent", () => {
  it("treats nil, undefined, false and whitespace-only strings as blank", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(false)).toBe(true);
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
  });

  it("treats a real value as present", () => {
    expect(isBlank("x")).toBe(false);
    expect(isBlank(0)).toBe(false);
    expect(isPresent("x")).toBe(true);
  });
});

describe("asNumber", () => {
  it("accepts a number and a decimal written as a string", () => {
    expect(asNumber(10)).toBe(10);
    expect(asNumber("10")).toBe(10);
    expect(asNumber("10.5")).toBe(10.5);
    expect(asNumber(".5")).toBe(0.5);
    expect(asNumber("-3")).toBe(-3);
  });

  it("returns null for anything that is not a number", () => {
    expect(asNumber("abc")).toBeNull();
    expect(asNumber("")).toBeNull();
    expect(asNumber(null)).toBeNull();
    expect(asNumber(NaN)).toBeNull();
  });
});

describe("isValidISODate", () => {
  it("accepts a real calendar date", () => {
    expect(isValidISODate("2000-01-01")).toBe(true);
    expect(isValidISODate("1815-12-10")).toBe(true);
  });

  it("rejects a non-date and an impossible date", () => {
    expect(isValidISODate("not-a-date")).toBe(false);
    expect(isValidISODate("2000-13-40")).toBe(false);
    expect(isValidISODate("2000/01/01")).toBe(false);
  });
});

describe("toISODate", () => {
  it("turns a UTC-midnight Date back into YYYY-MM-DD", () => {
    expect(toISODate(new Date("1815-12-10T00:00:00.000Z"))).toBe("1815-12-10");
  });
});

describe("formatMoney", () => {
  it("trims trailing zeros but keeps at least one decimal", () => {
    expect(formatMoney("159.90")).toBe("159.9");
    expect(formatMoney("129.00")).toBe("129.0");
    expect(formatMoney("123.45")).toBe("123.45");
    expect(formatMoney("50")).toBe("50.0");
  });
});
