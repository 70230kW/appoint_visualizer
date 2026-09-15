const adminRequire = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
const { initializeApp } = adminRequire("firebase-admin/app");
const { getFirestore } = adminRequire("firebase-admin/firestore");
const { getAuth } = adminRequire("firebase-admin/auth");
const { provisionMember } = require("./provision-member.cjs");
const [projectId, tenantId, uid, role, name, storeName, ...extra] =
  process.argv.slice(2);
if (!projectId || !tenantId || !uid || !role || !name || extra.length) {
  console.error(
    "Usage: npm run provision -- PROJECT_ID TENANT_ID AUTH_UID Admin|Staff DISPLAY_NAME [STORE_NAME]",
  );
  process.exit(1);
}
initializeApp({ projectId });
provisionMember({
  db: getFirestore(),
  auth: getAuth(),
  tenantId,
  uid,
  role,
  name,
  storeName,
})
  .then(() =>
    console.log(
      "登録完了。対象ユーザーはログインし直すか「所属情報を更新」を押してください。",
    ),
  )
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
