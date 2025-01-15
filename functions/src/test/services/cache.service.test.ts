import { getFirestore } from "firebase-admin/firestore";
import { getCachedData, setCachedData } from "../../services/cacheService";
import { getCurrentUnixMillis } from "../../utils/timestamp";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
}));

describe("Cache Service", () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(),
  };

  const mockDoc = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const TEST_COLLECTION = "test-collection";
  const TEST_KEY = "test-key";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
  });

  describe("getCachedData", () => {
    it("should return null for non-existent cache", async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      const result = await getCachedData(TEST_KEY, TEST_COLLECTION);
      expect(result).toBeNull();
    });

    it("should return null for expired cache", async () => {
      const now = Date.now();
      (getCurrentUnixMillis as jest.Mock).mockReturnValue(now);

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          value: "cached-data",
          timestamp: now - CACHE_DURATION - 1000, // Expired by 1 second
        }),
      });

      const result = await getCachedData(TEST_KEY, TEST_COLLECTION);
      expect(result).toBeNull();
    });

    it("should return cached data if not expired", async () => {
      const now = Date.now();
      (getCurrentUnixMillis as jest.Mock).mockReturnValue(now);

      const cachedData = {
        value: "cached-data",
        timestamp: now - CACHE_DURATION + 1000, // Not expired yet
      };

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => cachedData,
      });

      const result = await getCachedData<typeof cachedData>(TEST_KEY, TEST_COLLECTION);
      expect(result).toEqual(cachedData);
    });

    it("should handle database errors gracefully", async () => {
      mockDoc.get.mockRejectedValueOnce(new Error("Database error"));

      const result = await getCachedData(TEST_KEY, TEST_COLLECTION);
      expect(result).toBeNull();
    });
  });

  describe("setCachedData", () => {
    it("should set cache data with timestamp", async () => {
      const now = Date.now();
      (getCurrentUnixMillis as jest.Mock).mockReturnValue(now);

      const data = { value: "test-data" };
      await setCachedData(TEST_KEY, TEST_COLLECTION, data);

      expect(mockDoc.set).toHaveBeenCalledWith({
        ...data,
        timestamp: now,
      });
    });

    it("should handle database errors gracefully", async () => {
      mockDoc.set.mockRejectedValueOnce(new Error("Database error"));

      // Should not throw error
      await expect(
        setCachedData(TEST_KEY, TEST_COLLECTION, { value: "test-data" }),
      ).resolves.not.toThrow();
    });

    it("should preserve existing data structure", async () => {
      const now = Date.now();
      (getCurrentUnixMillis as jest.Mock).mockReturnValue(now);

      const complexData = {
        value: "test-data",
        nested: {
          field: "nested-value",
        },
        array: [1, 2, 3],
      };

      await setCachedData(TEST_KEY, TEST_COLLECTION, complexData);

      expect(mockDoc.set).toHaveBeenCalledWith({
        ...complexData,
        timestamp: now,
      });
    });
  });
});
