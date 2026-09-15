import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("default deployment excludes Functions while Blaze configuration retains them", () => {
  const spark = JSON.parse(readFileSync("firebase.json", "utf8"));
  const blaze = JSON.parse(readFileSync("firebase.blaze.json", "utf8"));
  assert.equal(spark.functions, undefined);
  assert.ok(spark.firestore && spark.hosting);
  assert.equal(blaze.functions.source, "functions");
});
