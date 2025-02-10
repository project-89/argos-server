import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "../constants/database/collections";
import {
  Mission,
  MissionSchema,
  MissionWithHistory,
  MissionStatusEnum,
} from "../schemas/mission.schema";
import { z } from "zod";

const db = getFirestore();

export class MissionService {
  private collection = db.collection(COLLECTIONS.MISSIONS);

  /**
   * Create a new mission
   * @param mission Mission data to create
   * @returns Created mission data
   */
  async createMission(mission: Mission): Promise<Mission> {
    try {
      const validatedMission = MissionSchema.parse(mission);
      const docRef = await this.collection.add(validatedMission);
      const doc = await docRef.get();
      const data = doc.data();
      if (!data) throw new Error("Failed to create mission: No data returned");
      return { id: doc.id, ...data } as Mission;
    } catch (error: unknown) {
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
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (!data) return null;
      return { id: doc.id, ...data } as Mission;
    } catch (error: unknown) {
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
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (!data) return null;
      return { id: doc.id, ...data } as MissionWithHistory;
    } catch (error: unknown) {
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
      const docRef = this.collection.doc(id);
      await docRef.update({ status });
      const doc = await docRef.get();
      const data = doc.data();
      if (!data) throw new Error("Failed to update mission status: No data returned");
      return { id: doc.id, ...data } as Mission;
    } catch (error: unknown) {
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
      const snapshot = await this.collection
        .where("status", "==", MissionStatusEnum.enum.available)
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        if (!data) throw new Error("Invalid mission data found");
        return { id: doc.id, ...data } as Mission;
      });
    } catch (error: unknown) {
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
      const snapshot = await this.collection.where("createdBy", "==", creatorId).get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        if (!data) throw new Error("Invalid mission data found");
        return { id: doc.id, ...data } as Mission;
      });
    } catch (error: unknown) {
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
      await this.collection.doc(id).delete();
    } catch (error: unknown) {
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
      const docRef = this.collection.doc(id);
      await docRef.update({ objectives });
      const doc = await docRef.get();
      const data = doc.data();
      if (!data) throw new Error("Failed to update mission objectives: No data returned");
      return { id: doc.id, ...data } as Mission;
    } catch (error: unknown) {
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
      const snapshot = await this.collection
        .where("status", "==", MissionStatusEnum.enum.active)
        .where("participants", "array-contains", participantId)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        if (!data) throw new Error("Invalid mission data found");
        return { id: doc.id, ...data } as Mission;
      });
    } catch (error: unknown) {
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
      const docRef = this.collection.doc(id);
      await docRef.update({
        failureRecords: FieldValue.arrayUnion(failureRecord),
      });
      const doc = await docRef.get();
      const data = doc.data();
      if (!data) throw new Error("Failed to add failure record: No data returned");
      return { id: doc.id, ...data } as Mission;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to add failure record: ${error.message}`);
      }
      throw new Error("Failed to add failure record: Unknown error");
    }
  }
}
