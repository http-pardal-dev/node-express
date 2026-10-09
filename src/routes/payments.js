"use strict";

const express = require("express");
const prisma = require("../prisma");
const { Payment } = require("../models");
const { json, jsonBody } = require("../helpers/json");
const { findOr404, restrictAttributes, validateOr400 } = require("../helpers/records");
const { inclusionParam } = require("../helpers/params");
const { HttpError } = require("../errors/errors");

// Routes for the Payments resource — lifecycle.
//
// A payment starts as "pending" and moves to "paid" or "cancelled". The actions
// are sub-resources (POST /payments/:id/confirm), and the status code tells the
// client what happened: 200 ok, 201 created, 404 not found and 409 conflict
// (transition not allowed from the current state).
//
// The confirm and cancel actions are atomic: the current state is part of the
// UPDATE itself (see Payment.transition), so of two concurrent transitions on
// the same payment, exactly one wins and the other answers 409. They are not
// idempotent: repeating a confirm on a payment that already left "pending"
// answers 409, because the second request changes nothing.

const router = express.Router();

const findById = (id) => prisma.payment.findUnique({ where: { id } });

// POST /payments - creates a pending payment. 201 with a Location header.
router.post("/", async (req, res, next) => {
  try {
    const attributes = restrictAttributes(jsonBody(req), Payment.WRITABLE_ATTRIBUTES);
    await validateOr400(Payment, attributes);

    const payment = await prisma.payment.create({ data: Payment.buildData(attributes) });

    res.set("Location", `/payments/${payment.id}`);
    json(res, { payment: Payment.toJson(payment) }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /payments - lists payments, optionally filtered by state.
//   GET /payments?status=... -> filter by state
router.get("/", async (req, res, next) => {
  try {
    const where = {};
    const status = inclusionParam(req.query.status, "status", Payment.STATUSES);
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({ where, orderBy: { id: "asc" } });
    json(res, { payments: payments.map(Payment.toJson) });
  } catch (err) {
    next(err);
  }
});

// GET /payments/:id - finds a payment by id.
router.get("/:id", async (req, res, next) => {
  try {
    const payment = await findOr404(req, req.params.id, { findById, label: "Payment" });
    json(res, { payment: Payment.toJson(payment) });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/confirm - confirms a payment (pending -> paid).
//
// Only a "pending" payment can be confirmed; any other state is a conflict. The
// transition is atomic, so a concurrent cancel cannot slip in between.
router.post("/:id/confirm", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "Payment" });
    const moved = await Payment.transition(existing.id, "paid");

    if (!moved) {
      const current = await findById(existing.id);
      throw new HttpError(409, {
        error: `A payment with status ${current.status} cannot be confirmed`,
      });
    }

    const payment = await findById(existing.id);
    json(res, { payment: Payment.toJson(payment) });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/cancel - cancels a payment (pending -> cancelled).
router.post("/:id/cancel", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "Payment" });
    const moved = await Payment.transition(existing.id, "cancelled");

    if (!moved) {
      const current = await findById(existing.id);
      throw new HttpError(409, {
        error: `A payment with status ${current.status} cannot be cancelled`,
      });
    }

    const payment = await findById(existing.id);
    json(res, { payment: Payment.toJson(payment) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
