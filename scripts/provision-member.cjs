const { validId, roles } = require("../functions/policy");
async function provisionMember({
  db,
  auth,
  tenantId,
  uid,
  role,
  name,
  storeName,
}) {
  if (
    !validId(tenantId) ||
    !validId(uid) ||
    !roles.includes(role) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100
  )
    throw new Error("店舗ID・UID・権限・氏名を確認してください");
  if (
    storeName !== undefined &&
    (typeof storeName !== "string" ||
      !storeName.trim() ||
      storeName.length > 100)
  )
    throw new Error("店舗名を確認してください");
  const user = await auth.getUser(uid);
  if (!user.email || !user.emailVerified || user.disabled)
    throw new Error("有効なアカウントでメール認証を完了してください");
  if (user.customClaims?.tenantId && user.customClaims.tenantId !== tenantId)
    throw new Error("別店舗の権限が付与済みです");
  const tenant = db.doc(`tenants/${tenantId}`),
    staff = tenant.collection("staff").doc(uid),
    membership = db.doc(`memberships/${uid}`);
  await db.runTransaction(async (tx) => {
    const [t, s, m] = await tx.getAll(tenant, staff, membership);
    if (m.exists && m.data().tenantId !== tenantId)
      throw new Error("既に別の店舗に所属しています");
    if (!t.exists && (role !== "Admin" || !storeName || s.exists))
      throw new Error("店舗の初期作成にはAdminと店舗名が必要です");
    if (s.exists && (s.data().role !== role || s.data().uid !== uid))
      throw new Error(
        "既存の権限・UIDと一致しません。このコマンドでは変更できません",
      );
    if (
      t.exists &&
      (!Number.isInteger(t.data().staffCount) || t.data().staffCount < 0)
    )
      throw new Error("スタッフ数の整合性を確認してください");
    if (!s.exists) {
      tx.create(staff, { uid, name: name.trim(), email: user.email, role });
      if (t.exists) tx.update(tenant, { staffCount: t.data().staffCount + 1 });
      else
        tx.create(tenant, {
          name: storeName.trim(),
          createdAt: new Date(),
          staffCount: 1,
        });
    }
    tx.set(membership, { tenantId });
  });
  // Safe to rerun after a claims write failure: membership/count are idempotent.
  await auth.setCustomUserClaims(uid, { ...user.customClaims, tenantId, role });
  return { tenantId, uid, role };
}
module.exports = { provisionMember };
