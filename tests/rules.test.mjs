import { test, after, before } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-appoint",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const t of ["one", "two"]) {
      await setDoc(doc(db, `tenants/${t}`), { name: t, staffCount: 1 });
      await setDoc(doc(db, `tenants/${t}/staff/user`), {
        uid: "user",
        name: "Test",
        role: "Staff",
        email: "a@b.test",
      });
      await setDoc(doc(db, `tenants/${t}/customers/customer`), {
        name: "Customer",
        contact: "",
        memo: "",
      });
    }
  });
});
after(async () => env?.cleanup());
const db = () =>
  env
    .authenticatedContext("user", { tenantId: "one", role: "Staff" })
    .firestore();
test("unauthenticated and other tenant reads denied", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "tenants/one")),
  );
  await assertFails(getDoc(doc(db(), "tenants/two")));
  await assertSucceeds(getDoc(doc(db(), "tenants/one")));
});
test("staff cannot read invites or modify role/count", async () => {
  await assertFails(getDoc(doc(db(), "tenants/one/invites/secret")));
  await assertFails(
    updateDoc(doc(db(), "tenants/one/staff/user"), { role: "Admin" }),
  );
  await assertFails(updateDoc(doc(db(), "tenants/one"), { staffCount: 99 }));
});
test("valid appointments accepted, invalid and cross-tenant writes rejected", async () => {
  const a = {
    customerId: "customer",
    customerName: "Customer",
    vehicleName: "Car",
    reason: "試乗",
    staffId: "user",
    datetime: Timestamp.now(),
    status: "未対応",
  };
  await assertSucceeds(setDoc(doc(db(), "tenants/one/appointments/a"), a));
  await assertFails(setDoc(doc(db(), "tenants/two/appointments/a"), a));
  await assertFails(
    setDoc(doc(db(), "tenants/one/appointments/b"), {
      ...a,
      status: "unknown",
    }),
  );
  await assertFails(
    setDoc(doc(db(), "tenants/one/appointments/b"), {
      ...a,
      staffId: "missing",
    }),
  );
});
test("forged Admin claim without matching staff role cannot administer", async () => {
  const forged = env
    .authenticatedContext("user", { tenantId: "one", role: "Admin" })
    .firestore();
  await assertFails(getDoc(doc(forged, "tenants/one/invites/x")));
});
