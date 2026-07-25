import { describe, expect, it } from "vitest";

import { isShareRole, shareRoleLabel } from "@/lib/share-role";

describe("share role helpers", () => {
  it("accepts only VIEW and EDIT", () => {
    expect(isShareRole("VIEW")).toBe(true);
    expect(isShareRole("EDIT")).toBe(true);
    expect(isShareRole("OWNER")).toBe(false);
    expect(isShareRole("view")).toBe(false);
    expect(isShareRole(null)).toBe(false);
    expect(isShareRole(undefined)).toBe(false);
  });

  it("labels roles for the share UI", () => {
    expect(shareRoleLabel("EDIT")).toBe("Can edit");
    expect(shareRoleLabel("VIEW")).toBe("Can view");
  });
});
