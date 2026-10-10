import { test as teardown } from "@playwright/test";
import { deleteAccounts } from "./support/accounts";

teardown("delete the test accounts", async () => {
  await deleteAccounts();
});
