const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const adminRequire = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
const { initializeApp, deleteApp } = adminRequire("firebase-admin/app");
const { getFirestore } = adminRequire("firebase-admin/firestore");
const { getAuth } = adminRequire("firebase-admin/auth");
const { provisionMember } = require("../scripts/provision-member.cjs");
const app = initializeApp({ projectId: "demo-appoint" }),
  db = getFirestore(),
  auth = getAuth();
after(() => deleteApp(app));
test("manual provisioning: bootstrap, verification, concurrency, tenant isolation, claims recovery", async () => {
  for (const uid of ["owner", "staff", "unverified", "recover"])
    await auth.createUser({
      uid,
      email: `${uid}@example.test`,
      emailVerified: uid !== "unverified",
    });
  const input = {
    db,
    auth,
    tenantId: "shop",
    uid: "owner",
    role: "Admin",
    name: "Owner",
    storeName: "Test shop",
  };
  await provisionMember(input);
  assert.equal((await db.doc("tenants/shop").get()).data().staffCount, 1);
  const member = {
    db,
    auth,
    tenantId: "shop",
    uid: "staff",
    role: "Staff",
    name: "Staff",
  };
  await Promise.all([provisionMember(member), provisionMember(member)]);
  assert.equal((await db.doc("tenants/shop").get()).data().staffCount, 2);
  assert.equal((await auth.getUser("staff")).customClaims.role, "Staff");
  await assert.rejects(
    provisionMember({ ...member, tenantId: "other" }),
    /別店舗/,
  );
  await assert.rejects(provisionMember({ ...member, role: "Admin" }), /一致/);
  await assert.rejects(
    provisionMember({ ...member, uid: "unverified" }),
    /メール認証/,
  );
  const failingAuth = {
    getUser: (uid) => auth.getUser(uid),
    setCustomUserClaims: async () => {
      throw new Error("simulated claims failure");
    },
  };
  await assert.rejects(
    provisionMember({ ...member, uid: "recover", auth: failingAuth }),
    /simulated/,
  );
  await provisionMember({ ...member, uid: "recover" });
  assert.equal((await db.doc("tenants/shop").get()).data().staffCount, 3);
  assert.equal((await auth.getUser("recover")).customClaims.tenantId, "shop");
});
