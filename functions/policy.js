const roles = ["Admin", "Staff"];
function validId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
function assertInvite(invite, uid, now) {
  if (!invite || invite.revoked || !roles.includes(invite.role))
    throw new Error("招待が無効です");
  if (invite.used) {
    if (invite.acceptedBy === uid) return;
    throw new Error("招待は使用済みです");
  }
  if (invite.expiresAt.toMillis() <= now)
    throw new Error("招待の有効期限が切れています");
}
module.exports = { roles, validId, assertInvite };
