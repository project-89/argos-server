import { getFirestore } from "firebase-admin/firestore";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedData = async <T>(key: string, collection: string): Promise<T | null> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(collection).doc(key).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data || Date.now() - data.timestamp > CACHE_DURATION) {
      return null;
    }

    return data as T;
  } catch (error) {
    console.error("Error getting cached data:", error);
    return null;
  }
};

export const setCachedData = async <T>(key: string, collection: string, data: T): Promise<void> => {
  try {
    const db = getFirestore();
    await db
      .collection(collection)
      .doc(key)
      .set({
        ...data,
        timestamp: Date.now(),
      });
  } catch (error) {
    console.error("Error setting cached data:", error);
  }
};
