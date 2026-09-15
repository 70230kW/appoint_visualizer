const adminRequire = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = adminRequire("firebase-admin/app");
const { getFirestore, Timestamp } = adminRequire("firebase-admin/firestore");
const { getAuth } = adminRequire("firebase-admin/auth");
const app = initializeApp({ projectId: "demo-appoint" }),
  db = getFirestore(),
  auth = getAuth();
async function user(id, claims) {
  await auth.createUser({
    uid: id,
    email: `${id}@example.test`,
    password: "password123",
    emailVerified: true,
  });
  if (claims) await auth.setCustomUserClaims(id, claims);
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake",
    {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${id}@example.test`,
        password: "password123",
        returnSecureToken: true,
      }),
    },
  );
  return (await r.json()).idToken;
}
async function call(name, token, data) {
  const r = await fetch(
    `http://127.0.0.1:5001/demo-appoint/asia-northeast1/${name}`,
    {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data }),
    },
  );
  const body = await r.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}
after(() => deleteApp(app));
test("invitation authorization, concurrent single-use, retry and revocation", async () => {
  const admin = await user("admin", { tenantId: "one", role: "Admin" }),
    a = await user("alice"),
    b = await user("bob");
  await db
    .doc("tenants/one")
    .set({ name: "Test", staffCount: 1, createdAt: Timestamp.now() });
  await db.doc("tenants/one/staff/admin").set({
    uid: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "Admin",
  });
  await assert.rejects(call("createInvite", a, { role: "Admin" }));
  const invitation = await call("createInvite", admin, { role: "Staff" });
  const outcomes = await Promise.allSettled([
    call("onInviteAccept", a, { ...invitation, name: "Alice" }),
    call("onInviteAccept", b, { ...invitation, name: "Bob" }),
  ]);
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal((await db.doc("tenants/one").get()).data().staffCount, 2);
  const winner = outcomes[0].status === "fulfilled" ? "alice" : "bob";
  assert.equal((await auth.getUser(winner)).customClaims.tenantId, "one");
  await call("onInviteAccept", winner === "alice" ? a : b, {
    ...invitation,
    name: "Retry",
  });
  assert.equal((await db.doc("tenants/one").get()).data().staffCount, 2);
  const revoked = await call("createInvite", admin, { role: "Staff" });
  const { createHash } = require("node:crypto");
  await call("revokeInvite", admin, {
    id: createHash("sha256").update(revoked.token).digest("hex"),
  });
  await assert.rejects(
    call("onInviteAccept", a, { ...revoked, name: "Alice" }),
  );
});
