import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants";

interface Visit {
  fingerprintId: string;
  timestamp: number;
  url: string;
  title?: string;
  [key: string]: any;
}

interface VisitWithId extends Visit {
  id: string;
}

export const getVisitHistory = async ({
  fingerprintId,
}: {
  fingerprintId: string;
}): Promise<VisitWithId[]> => {
  if (!fingerprintId) {
    throw new Error("Missing fingerprintId");
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.VISITS)
      .where("fingerprintId", "==", fingerprintId)
      .orderBy("timestamp", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as VisitWithId[];
  } catch (error: any) {
    if (error.code === 9 && error.message.includes("requires an index")) {
      console.error("Index required for this query. Please create the following index:");
      console.error(`Collection: ${COLLECTIONS.VISITS}`);
      console.error("Fields: fingerprintId (ASC), timestamp (DESC)");
      throw new Error("Database index not ready. Please try again in a few minutes.");
    }
    throw error;
  }
};
