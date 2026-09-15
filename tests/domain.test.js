import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { range } from "../src/calendar.js";
const { assertInvite, validId } = createRequire(import.meta.url)(
  "../functions/policy.js",
);
test("month range handles leap years and exclusive upper boundary", () => {
  const r = range("2024-02-20", "1m");
  assert.equal(r.days.length, 29);
  assert.equal(r.end.format("YYYY-MM-DD"), "2024-03-01");
});
test("all calendar periods have expected days across year boundary", () => {
  for (const [v, n] of Object.entries({
    "1d": 1,
    "3d": 3,
    "5d": 5,
    "1w": 7,
    "2w": 14,
  })) {
    const r = range("2026-12-30", v);
    assert.equal(r.days.length, n);
    assert.equal(r.end.diff(r.start, "day"), n);
  }
});
test("invite rejects expired, revoked, invalid and consumed tokens", () => {
  const good = {
    role: "Staff",
    used: false,
    expiresAt: { toMillis: () => 100 },
  };
  assert.doesNotThrow(() => assertInvite(good, "a", 99));
  for (const i of [
    null,
    { ...good, revoked: true },
    { ...good, role: "Owner" },
    { ...good, used: true, acceptedBy: "b" },
  ])
    assert.throws(() => assertInvite(i, "a", 99));
  assert.throws(() => assertInvite(good, "a", 100));
});
test("same user can recover claims after successful acceptance even after expiry", () =>
  assert.doesNotThrow(() =>
    assertInvite({ role: "Staff", used: true, acceptedBy: "a" }, "a", 1000),
  ));
test("reject path injection in tenant and invite identifiers", () => {
  assert.ok(validId("tenant-1"));
  for (const id of ["../tenant", "a/b", "", null])
    assert.equal(validId(id), false);
});
