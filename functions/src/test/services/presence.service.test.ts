import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants";
import { updatePresence, getPresence } from "../../services/presenceService";
import { ApiError } from "../../utils/error";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
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
        presence: expect.objectContaining({
          status,
          lastUpdated: expect.any(String),
        }),
      });
      expect(result).toEqual({
        fingerprintId,
        status,
        lastUpdated: expect.any(String),
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";
      const status = "online";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(updatePresence(fingerprintId, status)).rejects.toThrow(
        new ApiError(404, "Fingerprint not found"),
      );
    });
  });

  describe("getPresence", () => {
    it("should get presence status for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const mockPresence = {
        status: "online",
        lastUpdated: "2023-01-01T00:00:00.000Z",
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
        lastUpdated: expect.any(String),
      });
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(getPresence(fingerprintId)).rejects.toThrow(
        new ApiError(404, "Fingerprint not found"),
      );
    });
  });
});
