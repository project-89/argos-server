import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants";

export const validateApiKey = async (
  apiKey: string,
): Promise<{ isValid: boolean; fingerprintId?: string }> => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(COLLECTIONS.API_KEYS).where("key", "==", apiKey).get();

    if (snapshot.empty) {
      return { isValid: false };
    }

    const doc = snapshot.docs[0];
    return {
      isValid: true,
      fingerprintId: doc.data().fingerprintId,
    };
  } catch (error) {
    console.error("Error validating API key:", error);
    return { isValid: false };
  }
};
