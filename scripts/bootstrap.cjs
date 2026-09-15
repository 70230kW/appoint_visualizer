const adminRequire = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
// Run with trusted Application Default Credentials. Never put a service key in git.
const { initializeApp } = adminRequire("firebase-admin/app");
const { getFirestore, Timestamp } = adminRequire("firebase-admin/firestore");
const { getAuth } = adminRequire("firebase-admin/auth");
const { validId } = require("../functions/policy");
const [projectId, tenantId, uid, name] = process.argv.slice(2);
if (!projectId || !validId(tenantId) || !uid || !name)
  throw new Error(
    "Usage: node scripts/bootstrap.cjs PROJECT TENANT UID STORE_NAME",
  );
initializeApp({ projectId });
(async () => {
  const db = getFirestore(),
    user = await getAuth().getUser(uid);
  if (!user.emailVerified)
    throw new Error("Verify the first admin email first");
  const tenant = db.doc(`tenants/${tenantId}`),
    staff = tenant.collection("staff").doc(uid),
    membership = db.doc(`memberships/${uid}`);
  await db.runTransaction(async (tx) => {
    const [t, s, m] = await tx.getAll(tenant, staff, membership);
    if (m.exists && m.data().tenantId !== tenantId)
      throw new Error("Already belongs to another tenant");
    if (t.exists && !s.exists)
      throw new Error("Tenant exists; use an invitation");
    if (s.exists && s.data().role !== "Admin")
      throw new Error("Existing staff cannot be promoted by bootstrap");
    if (!t.exists)
      tx.create(tenant, { name, createdAt: Timestamp.now(), staffCount: 1 });
    if (!s.exists)
      tx.create(staff, {
        uid,
        name: user.displayName || "管理者",
        email: user.email,
        role: "Admin",
      });
    tx.set(membership, { tenantId });
  });
  await getAuth().setCustomUserClaims(uid, {
    ...user.customClaims,
    tenantId,
    role: "Admin",
  });
  console.log("Admin provisioned. Sign in again.");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
