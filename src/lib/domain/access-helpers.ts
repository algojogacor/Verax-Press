// Helper akses ringan untuk dipakai serializer & routes.
import type { Role } from "@/types/verity";

export function canVerifySources(user: { role: Role }): boolean {
  return user.role === "CHIEF_EDITOR" || user.role === "EDITOR";
}
