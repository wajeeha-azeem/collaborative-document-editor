export type ShareRole = "VIEW" | "EDIT";

export function isShareRole(value: unknown): value is ShareRole {
  return value === "VIEW" || value === "EDIT";
}

export function shareRoleLabel(role: ShareRole): string {
  return role === "EDIT" ? "Can edit" : "Can view";
}
