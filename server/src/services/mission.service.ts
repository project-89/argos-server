import { COLLECTIONS } from "../constants/database/collections";
import {
  Mission,
  MissionSchema,
  MissionWithHistory,
  MissionStatusEnum,
} from "../schemas/mission.schema";
import { getDb, formatDocument, formatDocuments } from "../utils/mongodb";
import { z } from "zod";
import { idFilter, stringIdFilter } from "../utils/mongo-filters";

const LOG_PREFIX = "[Mission Service]";

export class MissionService {
  /**
   * Create a new mission
   * @param mission Mission data to create
   * @returns Created mission data
   */
  async createMission(mission: Mission): Promise<Mission> {
    try {
      const validatedMission = MissionSchema.parse(mission);
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      // Omit id field for insertion
      const { id, ...missionData } = validatedMission;

      const result = await collection.insertOne(missionData);
      const insertedId = result.insertedId.toString();

      return {
        id: insertedId,
        ...missionData,
      } as Mission;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error creating mission:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to create mission: ${error.message}`);
      }
      throw new Error("Failed to create mission: Unknown error");
    }
  }

  /**
   * Get a mission by ID
   * @param id Mission ID
   * @returns Mission data or null if not found
   */
  async getMission(id: string): Promise<Mission | null> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        console.warn(`${LOG_PREFIX} Invalid mission ID: ${id}`);
        return null;
      }

      const doc = await collection.findOne(filter);
      if (!doc) return null;

      return formatDocument(doc) as Mission;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error getting mission:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get mission: ${error.message}`);
      }
      throw new Error("Failed to get mission: Unknown error");
    }
  }

  /**
   * Get a mission with history by ID
   * @param id Mission ID
   * @returns Mission with history data or null if not found
   */
  async getMissionWithHistory(id: string): Promise<MissionWithHistory | null> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        console.warn(`${LOG_PREFIX} Invalid mission ID: ${id}`);
        return null;
      }

      const doc = await collection.findOne(filter);
      if (!doc) return null;

      return formatDocument(doc) as MissionWithHistory;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error getting mission with history:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get mission with history: ${error.message}`);
      }
      throw new Error("Failed to get mission with history: Unknown error");
    }
  }

  /**
   * Update a mission's status
   * @param id Mission ID
   * @param status New mission status
   * @returns Updated mission data
   */
  async updateMissionStatus(
    id: string,
    status: z.infer<typeof MissionStatusEnum>,
  ): Promise<Mission> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        throw new Error(`Invalid mission ID: ${id}`);
      }

      const result = await collection.findOneAndUpdate(
        filter,
        { $set: { status, updatedAt: Date.now() } },
        { returnDocument: "after" },
      );

      if (!result) {
        throw new Error("Failed to update mission status: No data returned");
      }

      return formatDocument(result) as Mission;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error updating mission status:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to update mission status: ${error.message}`);
      }
      throw new Error("Failed to update mission status: Unknown error");
    }
  }

  /**
   * Get available missions for a participant
   * @param participantId Participant's ID
   * @param limit Number of missions to return
   * @returns Array of available missions
   */
  async getAvailableMissions(participantId: string, limit = 10): Promise<Mission[]> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const docs = await collection
        .find({ status: MissionStatusEnum.enum.available })
        .limit(limit)
        .toArray();

      return formatDocuments(docs) as Mission[];
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error getting available missions:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get available missions: ${error.message}`);
      }
      throw new Error("Failed to get available missions: Unknown error");
    }
  }

  /**
   * Get missions created by a specific user
   * @param creatorId Creator's ID
   * @returns Array of missions created by the user
   */
  async getMissionsByCreator(creatorId: string): Promise<Mission[]> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const docs = await collection.find({ createdBy: creatorId }).toArray();

      return formatDocuments(docs) as Mission[];
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error getting missions by creator:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get missions by creator: ${error.message}`);
      }
      throw new Error("Failed to get missions by creator: Unknown error");
    }
  }

  /**
   * Delete a mission
   * @param id Mission ID
   * @returns void
   */
  async deleteMission(id: string): Promise<void> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        throw new Error(`Invalid mission ID: ${id}`);
      }

      await collection.deleteOne(filter);
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error deleting mission:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete mission: ${error.message}`);
      }
      throw new Error("Failed to delete mission: Unknown error");
    }
  }

  /**
   * Update mission objectives
   * @param id Mission ID
   * @param objectives Updated objectives array
   * @returns Updated mission data
   */
  async updateMissionObjectives(
    id: string,
    objectives: MissionWithHistory["objectives"],
  ): Promise<Mission> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        throw new Error(`Invalid mission ID: ${id}`);
      }

      const result = await collection.findOneAndUpdate(
        filter,
        { $set: { objectives, updatedAt: Date.now() } },
        { returnDocument: "after" },
      );

      if (!result) {
        throw new Error("Failed to update mission objectives: No data returned");
      }

      return formatDocument(result) as Mission;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error updating mission objectives:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to update mission objectives: ${error.message}`);
      }
      throw new Error("Failed to update mission objectives: Unknown error");
    }
  }

  /**
   * Get active missions for a participant
   * @param participantId Participant's ID
   * @returns Array of active missions
   */
  async getActiveMissions(participantId: string): Promise<Mission[]> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const docs = await collection
        .find({
          status: MissionStatusEnum.enum.active,
          participants: { $in: [participantId] },
        })
        .toArray();

      return formatDocuments(docs) as Mission[];
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error getting active missions:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get active missions: ${error.message}`);
      }
      throw new Error("Failed to get active missions: Unknown error");
    }
  }

  /**
   * Add a failure record to a mission
   * @param id Mission ID
   * @param failureRecord Failure record to add
   * @returns Updated mission data
   */
  async addFailureRecord(
    id: string,
    failureRecord: NonNullable<MissionWithHistory["failureRecords"]>[number],
  ): Promise<Mission> {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.MISSIONS);

      const filter = idFilter(id);
      if (!Object.keys(filter).length) {
        throw new Error(`Invalid mission ID: ${id}`);
      }

      const result = await collection.findOneAndUpdate(
        filter,
        {
          $push: { failureRecords: failureRecord },
          $set: { updatedAt: Date.now() },
        },
        { returnDocument: "after" },
      );

      if (!result) {
        throw new Error("Failed to add failure record: No data returned");
      }

      return formatDocument(result) as Mission;
    } catch (error: unknown) {
      console.error(`${LOG_PREFIX} Error adding failure record:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to add failure record: ${error.message}`);
      }
      throw new Error("Failed to add failure record: Unknown error");
    }
  }
}
