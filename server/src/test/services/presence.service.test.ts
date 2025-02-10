import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../../constants";
import { updatePresence, getPresence } from "../../services/presence.service";
import { ApiError } from "../../utils/error";
import { getCurrentUnixMillis } from "../../utils/timestamp";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn().mockReturnValue({
      toMillis: () => 1672531200000,
      _seconds: 1672531200,
      _nanoseconds: 0,
    }),
  },
}));

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
  toUnixMillis: jest.fn().mockImplementation((timestamp) => {
    if (timestamp?._seconds) {
      return timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1000000);
    }
    return 1672531200000; // fallback
  }),
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

      const result = await updatePresence({ fingerprintId, status });

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockCollection.doc).toHaveBeenCalledWith(fingerprintId);
      expect(mockDoc.update).toHaveBeenCalledWith({
        presence: {
          status,
          lastUpdated: expect.any(Object),
          createdAt: expect.any(Object),
        },
      });
      expect(result).toEqual({
        fingerprintId,
        status,
        lastUpdated: mockTimestamp,
        createdAt: mockTimestamp,
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(updatePresence({ fingerprintId, status })).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should handle database errors gracefully", async () => {
      const fingerprintId = "test-fingerprint";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.update.mockRejectedValue(new Error("Database error"));

      await expect(updatePresence({ fingerprintId, status })).rejects.toThrow(
        ERROR_MESSAGES.FAILED_UPDATE_PRESENCE_STATUS,
      );
    });
  });

  describe("getPresence", () => {
    it("should get presence status for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const mockPresence = {
        status: "online" as const,
        lastUpdated: {
          _seconds: 1672531200,
          _nanoseconds: 0,
        },
        createdAt: {
          _seconds: 1672531200,
          _nanoseconds: 0,
        },
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ presence: mockPresence }),
      });

      const result = await getPresence({ fingerprintId });

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockCollection.doc).toHaveBeenCalledWith(fingerprintId);
      expect(result).toEqual({
        fingerprintId,
        status: mockPresence.status,
        lastUpdated: mockTimestamp,
        createdAt: mockTimestamp,
      });
    });

    it("should return offline status for fingerprint without presence data", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const result = await getPresence({ fingerprintId });

      expect(result).toEqual({
        fingerprintId,
        status: "offline",
        lastUpdated: mockTimestamp,
        createdAt: mockTimestamp,
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(getPresence({ fingerprintId })).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should handle database errors gracefully", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockRejectedValue(new Error("Database error"));

      await expect(getPresence({ fingerprintId })).rejects.toThrow(
        ERROR_MESSAGES.FAILED_GET_PRESENCE,
      );
    });

    it("should handle invalid presence data gracefully", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          presence: {
            status: "invalid-status",
            lastUpdated: mockTimestamp,
            createdAt: mockTimestamp,
          },
        }),
      });

      const result = await getPresence({ fingerprintId });

      expect(result).toEqual({
        fingerprintId,
        status: "invalid-status",
        lastUpdated: mockTimestamp,
        createdAt: mockTimestamp,
      });
    });

    it("should preserve ApiError when thrown", async () => {
      const fingerprintId = "test-fingerprint";
      const customError = new ApiError(418, "Custom API Error");

      mockDoc.get.mockRejectedValue(customError);

      await expect(getPresence({ fingerprintId })).rejects.toThrow("Custom API Error");
    });
  });
});
