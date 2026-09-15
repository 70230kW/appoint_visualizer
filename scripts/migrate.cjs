const adminRequire = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
// Non-destructive copy. Default dry run. Existing target documents must match exactly.
const { initializeApp } = adminRequire("firebase-admin/app");
const { getFirestore } = adminRequire("firebase-admin/firestore");
const { validId } = require("../functions/policy");
const { isDeepStrictEqual } = require("node:util");
const [projectId, tenantId, flag] = process.argv.slice(2);
if (!projectId || !validId(tenantId) || (flag && !["--apply"].includes(flag)))
  throw new Error("Usage: node scripts/migrate.cjs PROJECT TENANT [--apply]");
initializeApp({ projectId });
(async () => {
  const db = getFirestore();
  if (!(await db.doc(`tenants/${tenantId}`).get()).exists)
    throw new Error("Bootstrap tenant first");
  const pending = [];
  for (const name of ["customers", "appointments"]) {
    const source = await db.collection(name).get();
    for (const s of source.docs) {
      const data = s.data();
      if (
        name === "appointments" &&
        (!data.datetime?.toDate ||
          !["試乗", "商談", "車検"].includes(data.reason) ||
          !["未対応", "対応中", "完了"].includes(data.status))
      )
        throw new Error(
          `Schema mismatch: ${name}/${s.id}; map legacy data before applying`,
        );
      const target = db.doc(`tenants/${tenantId}/${name}/${s.id}`),
        existing = await target.get();
      if (existing.exists) {
        if (!isDeepStrictEqual(existing.data(), data))
          throw new Error(`Conflict: ${name}/${s.id}`);
      } else pending.push({ target, data });
    }
    console.log(`${name}: ${source.size} source documents`);
  }
  console.log(
    `${pending.length} documents to copy; ${flag === "--apply" ? "APPLY" : "DRY RUN"}`,
  );
  if (flag === "--apply")
    for (const { target, data } of pending) await target.create(data);
  console.log(
    "Source documents retained. Staff/auth mapping requires explicit verified UID mapping.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
