import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { updatePresence, getPresence } from "../../services/presenceService";
import { ApiError } from "../../utils/error";
import { getCurrentUnixMillis } from "../../utils/timestamp";
import { ERROR_MESSAGES } from "../../constants/api";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
}));

describe("Presence Service", () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(),
  };

  const mockDoc = {
    get: jest.fn(),
    update: jest.fn(),
  };

  const mockTimestamp = 1672531200000; // 2023-01-01T00:00:00.000Z

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    (getCurrentUnixMillis as jest.Mock).mockReturnValue(mockTimestamp);
  });

  describe("updatePresence", () => {
    it("should update presence status for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.update.mockResolvedValue({});

      const result = await updatePresence(fingerprintId, status);

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockCollection.doc).toHaveBeenCalledWith(fingerprintId);
      expect(mockDoc.update).toHaveBeenCalledWith({
        presence: {
          status,
          lastUpdated: mockTimestamp,
        },
      });
      expect(result).toEqual({
        fingerprintId,
        status,
        lastUpdated: mockTimestamp,
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(updatePresence(fingerprintId, status)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should handle database errors gracefully", async () => {
      const fingerprintId = "test-fingerprint";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.update.mockRejectedValue(new Error("Database error"));

      await expect(updatePresence(fingerprintId, status)).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR),
      );
    });
  });

  describe("getPresence", () => {
    it("should get presence status for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const mockPresence = {
        status: "online" as const,
        lastUpdated: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ presence: mockPresence }),
      });

      const result = await getPresence(fingerprintId);

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockCollection.doc).toHaveBeenCalledWith(fingerprintId);
      expect(result).toEqual({
        fingerprintId,
        status: mockPresence.status,
        lastUpdated: mockPresence.lastUpdated,
      });
    });

    it("should return offline status for fingerprint without presence data", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const result = await getPresence(fingerprintId);

      expect(result).toEqual({
        fingerprintId,
        status: "offline",
        lastUpdated: mockTimestamp,
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(getPresence(fingerprintId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should handle database errors gracefully", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockRejectedValue(new Error("Database error"));

      await expect(getPresence(fingerprintId)).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR),
      );
    });

    it("should handle invalid presence data gracefully", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          presence: {
            status: "invalid-status",
            lastUpdated: "invalid-timestamp",
          },
        }),
      });

      const result = await getPresence(fingerprintId);

      expect(result).toEqual({
        fingerprintId,
        status: "invalid-status",
        lastUpdated: "invalid-timestamp",
      });
    });
  });
});
