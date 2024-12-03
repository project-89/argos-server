import { getFirestore } from "firebase-admin/firestore";
import { PredefinedRole, Fingerprint, AssignRoleRequest } from "@/types";
import { COLLECTIONS, PREDEFINED_ROLES } from "@/constants";

export const assignRole = async ({
  fingerprintId,
  role,
}: AssignRoleRequest): Promise<PredefinedRole[]> => {
  if (!fingerprintId || !role) {
    throw new Error("Invalid request. Provide both fingerprintId and role.");
  }

  if (!PREDEFINED_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${PREDEFINED_ROLES.join(", ")}`);
  }

  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
  const doc = await fingerprintRef.get();

  if (!doc.exists) {
    throw new Error("Fingerprint not found.");
  }

  const data = doc.data() as Fingerprint;
  const currentRoles = data.roles || [];

  if (currentRoles.includes(role)) {
    return currentRoles;
  }

  const updatedRoles = Array.from(new Set([...currentRoles, role]));
  await fingerprintRef.update({ roles: updatedRoles });
  return updatedRoles;
};

export const getAvailableRoles = async (): Promise<PredefinedRole[]> => {
  return [...PREDEFINED_ROLES];
};

export const removeRole = async ({
  fingerprintId,
  role,
}: AssignRoleRequest): Promise<PredefinedRole[]> => {
  if (!fingerprintId || !role) {
    throw new Error("Invalid request. Provide both fingerprintId and role.");
  }

  if (!PREDEFINED_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${PREDEFINED_ROLES.join(", ")}`);
  }

  if (role === "user") {
    throw new Error("Cannot remove the 'user' role.");
  }

  const db = getFirestore();
  const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(fingerprintId);
  const doc = await fingerprintRef.get();

  if (!doc.exists) {
    throw new Error("Fingerprint not found.");
  }

  const data = doc.data() as Fingerprint;
  const currentRoles = data.roles || [];

  if (currentRoles.length === 1) {
    throw new Error("Cannot remove the last role.");
  }

  if (!currentRoles.includes(role)) {
    return currentRoles;
  }

  const updatedRoles = currentRoles.filter((r) => r !== role);
  await fingerprintRef.update({ roles: updatedRoles });
  return updatedRoles;
};
