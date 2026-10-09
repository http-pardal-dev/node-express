"use strict";

// Models of the API: one module per resource, mirroring app/models/<resource>.rb
// in ruby-sinatra. Each owns its rules (validation), its public JSON shape
// (toJson) and, for payments, its lifecycle transition. Persistence is Prisma.

const User = require("./user");
const Product = require("./product");
const Payment = require("./payment");

module.exports = { User, Product, Payment };
