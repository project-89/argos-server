import { getMongoClient } from "./mongodb";
import { ClientSession } from "mongodb";

/**
 * Start a MongoDB session with transaction
 * @returns MongoDB session
 */
export async function startMongoSession(): Promise<ClientSession> {
  const client = await getMongoClient();
  const session = client.startSession();
  session.startTransaction();
  return session;
}

/**
 * Commit a MongoDB transaction
 * @param session MongoDB session
 */
export async function commitTransaction(session: ClientSession): Promise<void> {
  if (!session) return;
  await session.commitTransaction();
  await session.endSession();
}

/**
 * Abort a MongoDB transaction
 * @param session MongoDB session
 */
export async function abortTransaction(session: ClientSession): Promise<void> {
  if (!session) return;
  await session.abortTransaction();
  await session.endSession();
}

/**
 * Execute a function within a MongoDB transaction
 * @param callback Function to execute within transaction
 * @returns Result of the callback function
 */
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await startMongoSession();
  try {
    const result = await callback(session);
    await commitTransaction(session);
    return result;
  } catch (error) {
    await abortTransaction(session);
    throw error;
  }
}

export default {
  startMongoSession,
  commitTransaction,
  abortTransaction,
  withTransaction,
};
