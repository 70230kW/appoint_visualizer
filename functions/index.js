const { randomBytes, createHash } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { roles, validId, assertInvite } = require("./policy");
initializeApp();
const db = getFirestore();
const options = { region: "asia-northeast1", maxInstances: 10 };
const hash = (token) => createHash("sha256").update(token).digest("hex");
function signed(req) {
  if (!req.auth)
    throw new HttpsError("unauthenticated", "ログインしてください");
  return req.auth.uid;
}
async function admin(req) {
  const uid = signed(req),
    tenantId = req.auth.token.tenantId;
  if (!validId(tenantId))
    throw new HttpsError("permission-denied", "管理者権限が必要です");
  const member = await db.doc(`tenants/${tenantId}/staff/${uid}`).get();
  if (req.auth.token.role !== "Admin" || member.data()?.role !== "Admin")
    throw new HttpsError("permission-denied", "管理者権限が必要です");
  return { uid, tenantId };
}
exports.createInvite = onCall(options, async (req) => {
  const { uid, tenantId } = await admin(req);
  const role = req.data?.role || "Staff";
  if (!roles.includes(role))
    throw new HttpsError("invalid-argument", "権限が不正です");
  const token = randomBytes(32).toString("hex");
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 86400000);
  await db
    .doc(`tenants/${tenantId}/invites/${hash(token)}`)
    .create({
      role,
      expiresAt,
      used: false,
      revoked: false,
      createdBy: uid,
      createdAt: Timestamp.now(),
    });
  return { token, tenantId, expiresAt: expiresAt.toDate().toISOString() };
});
exports.revokeInvite = onCall(options, async (req) => {
  const { tenantId } = await admin(req);
  if (!validId(req.data?.id))
    throw new HttpsError("invalid-argument", "招待IDが不正です");
  const ref = db.doc(`tenants/${tenantId}/invites/${req.data.id}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().used)
      throw new HttpsError(
        "failed-precondition",
        "使用済みまたは存在しない招待です",
      );
    tx.update(ref, { revoked: true, used: true });
  });
  return { ok: true };
});
exports.onInviteAccept = onCall(options, async (req) => {
  const uid = signed(req),
    { tenantId, token, name } = req.data || {};
  if (
    !validId(tenantId) ||
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100
  )
    throw new HttpsError("invalid-argument", "招待情報を確認してください");
  const user = await getAuth().getUser(uid);
  if (!user.emailVerified)
    throw new HttpsError("failed-precondition", "メール認証を完了してください");
  const inviteRef = db.doc(`tenants/${tenantId}/invites/${hash(token)}`);
  const membershipRef = db.doc(`memberships/${uid}`);
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const staffRef = tenantRef.collection("staff").doc(uid);
  const role = await db.runTransaction(async (tx) => {
    const [invite, membership, tenant, staff] = await tx.getAll(
      inviteRef,
      membershipRef,
      tenantRef,
      staffRef,
    );
    try {
      assertInvite(invite.data(), uid, Date.now());
    } catch (e) {
      throw new HttpsError("failed-precondition", e.message);
    }
    if (!tenant.exists)
      throw new HttpsError("not-found", "店舗が見つかりません");
    if (membership.exists && membership.data().tenantId !== tenantId)
      throw new HttpsError(
        "failed-precondition",
        "既に別の店舗に所属しています",
      );
    if (staff.exists) return staff.data().role;
    if (invite.data().used)
      throw new HttpsError(
        "failed-precondition",
        "所属情報を管理者に確認してください",
      );
    tx.create(staffRef, {
      uid,
      name: name.trim(),
      email: user.email,
      role: invite.data().role,
    });
    tx.set(membershipRef, { tenantId });
    tx.update(inviteRef, {
      used: true,
      acceptedBy: uid,
      acceptedAt: Timestamp.now(),
    });
    tx.update(tenantRef, { staffCount: FieldValue.increment(1) });
    return invite.data().role;
  });
  // Retryable after a claims write failure: the same authenticated user may retry.
  await getAuth().setCustomUserClaims(uid, {
    ...user.customClaims,
    tenantId,
    role,
  });
  return { tenantId, role };
});
exports.expireInvites = onSchedule(
  { ...options, schedule: "every day 03:00", timeZone: "Asia/Tokyo" },
  async () => {
    while (true) {
      const snaps = await db
        .collectionGroup("invites")
        .where("used", "==", false)
        .where("expiresAt", "<=", Timestamp.now())
        .limit(400)
        .get();
      if (snaps.empty) break;
      await Promise.all(
        snaps.docs.map((doc) =>
          db.runTransaction(async (tx) => {
            const current = await tx.get(doc.ref);
            if (current.exists && !current.data().used)
              tx.update(doc.ref, { used: true, expired: true });
          }),
        ),
      );
    }
  },
);
