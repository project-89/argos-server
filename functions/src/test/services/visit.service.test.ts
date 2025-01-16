import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import {
  logVisit,
  getVisitHistory,
  updatePresenceStatus,
  removeSiteAndVisits,
  extractDomain,
  verifyFingerprint,
} from "../../services/visitService";
import { ApiError } from "../../utils/error";
import { getCurrentUnixMillis } from "../../utils/timestamp";
import { ERROR_MESSAGES } from "../../constants/api";

class MockTimestamp {
  private seconds: number;
  private nanoseconds: number;

  constructor(seconds: number, nanoseconds: number = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }

  static now(): MockTimestamp {
    const now = Date.now();
    return new MockTimestamp(Math.floor(now / 1000), (now % 1000) * 1_000_000);
  }

  static fromMillis(milliseconds: number): MockTimestamp {
    return new MockTimestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }
}

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: () => MockTimestamp.now(),
    fromMillis: (ms: number) => MockTimestamp.fromMillis(ms),
  },
}));

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
}));

jest.mock("../../services/presenceService", () => ({
  updatePresence: jest.fn(),
}));

describe("Visit Service", () => {
  const mockFirestore = {
    collection: jest.fn(),
    batch: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(),
    add: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    get: jest.fn(),
  };

  const mockDoc = {
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockBatch = {
    delete: jest.fn(),
    commit: jest.fn(),
  };

  const mockTimestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
  const mockFirestoreTimestamp = MockTimestamp.fromMillis(mockTimestamp);

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockFirestore.batch.mockReturnValue(mockBatch);
    mockCollection.where.mockReturnValue(mockCollection);
    mockCollection.orderBy.mockReturnValue(mockCollection);
    mockCollection.limit.mockReturnValue(mockCollection);
    (getCurrentUnixMillis as jest.Mock).mockReturnValue(mockTimestamp);
  });

  describe("logVisit", () => {
    it("should log a visit and create a new site", async () => {
      const fingerprintId = "test-fingerprint";
      const url = "https://example.com/page";
      const title = "Example Page";
      const clientIp = "192.168.1.1";

      // Mock empty site query (new site)
      mockCollection.get.mockResolvedValueOnce({ empty: true });

      // Mock site creation
      const siteId = "test-site-id";
      mockCollection.add.mockResolvedValueOnce({ id: siteId });

      // Mock visit creation
      const visitId = "test-visit-id";
      mockCollection.add.mockResolvedValueOnce({ id: visitId });

      const result = await logVisit(fingerprintId, url, title, clientIp);

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.SITES);
      expect(mockCollection.where).toHaveBeenCalledWith("domain", "==", "example.com");
      expect(mockCollection.where).toHaveBeenCalledWith("fingerprintId", "==", fingerprintId);

      expect(result).toMatchObject({
        id: visitId,
        fingerprintId,
        url,
        title,
        siteId,
        clientIp,
        site: expect.objectContaining({
          id: siteId,
          domain: "example.com",
          fingerprintId,
          title,
          visits: 1,
          settings: {
            notifications: true,
            privacy: "private",
          },
        }),
      });

      // Verify timestamps are recent
      expect(typeof result.timestamp === "number").toBe(true);
      expect(result.site).toBeDefined();
      if (result.site) {
        expect(typeof result.site.lastVisited === "number").toBe(true);
        expect(typeof result.site.createdAt === "number").toBe(true);
        expect(Date.now() - result.timestamp).toBeLessThan(1000);
        expect(Date.now() - result.site.lastVisited).toBeLessThan(1000);
        expect(Date.now() - result.site.createdAt).toBeLessThan(1000);
      }
    });

    it("should log a visit and update existing site", async () => {
      const fingerprintId = "test-fingerprint";
      const url = "https://example.com/page";
      const title = "Example Page";
      const siteId = "test-site-id";

      const mockNow = MockTimestamp.now();
      const mockPast = MockTimestamp.fromMillis(mockNow.toMillis() - 1000);

      // Mock existing site query
      const existingSite = {
        domain: "example.com",
        fingerprintId,
        lastVisited: mockPast,
        createdAt: mockPast,
        title: "Old Title",
        visits: 5,
        settings: {
          notifications: true,
          privacy: "private",
        },
      };

      mockCollection.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: siteId,
            data: () => existingSite,
            ref: mockDoc,
          },
        ],
      });

      // Mock visit creation
      const visitId = "test-visit-id";
      mockCollection.add.mockResolvedValueOnce({ id: visitId });

      const result = await logVisit(fingerprintId, url, title);

      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          visits: 6,
          title,
        }),
      );

      expect(result).toMatchObject({
        id: visitId,
        fingerprintId,
        url,
        title,
        siteId,
        site: expect.objectContaining({
          id: siteId,
          domain: "example.com",
          fingerprintId,
          title,
          visits: 6,
          settings: {
            notifications: true,
            privacy: "private",
          },
        }),
      });

      // Verify timestamps
      expect(typeof result.timestamp === "number").toBe(true);
      expect(result.site).toBeDefined();
      if (result.site) {
        expect(typeof result.site.lastVisited === "number").toBe(true);
        expect(typeof result.site.createdAt === "number").toBe(true);
        expect(Date.now() - result.timestamp).toBeLessThan(1000);
        expect(Date.now() - result.site.lastVisited).toBeLessThan(1000);
        expect(result.site.createdAt).toBe(mockPast.toMillis());
      }
    });
  });

  describe("getVisitHistory", () => {
    it("should get visit history with site information", async () => {
      const fingerprintId = "test-fingerprint";
      const mockNow = MockTimestamp.now();
      const mockPast = MockTimestamp.fromMillis(mockNow.toMillis() - 1000);

      const visits = [
        {
          id: "visit-1",
          fingerprintId,
          url: "https://example.com/page1",
          title: "Page 1",
          siteId: "site-1",
          timestamp: mockNow,
        },
        {
          id: "visit-2",
          fingerprintId,
          url: "https://example.com/page2",
          title: "Page 2",
          siteId: "site-2",
          timestamp: mockPast,
        },
      ];

      const sites = {
        "site-1": {
          domain: "example.com",
          fingerprintId,
          lastVisited: mockNow,
          createdAt: mockPast,
          title: "Example Site 1",
          visits: 5,
          settings: { notifications: true, privacy: "private" },
        },
        "site-2": {
          domain: "example.com",
          fingerprintId,
          lastVisited: mockPast,
          createdAt: mockPast,
          title: "Example Site 2",
          visits: 3,
          settings: { notifications: true, privacy: "private" },
        },
      };

      // Mock visits query - Return Firestore timestamps in the data
      mockCollection.get.mockResolvedValueOnce({
        docs: visits.map((visit) => ({
          id: visit.id,
          data: () => ({
            fingerprintId: visit.fingerprintId,
            url: visit.url,
            title: visit.title,
            siteId: visit.siteId,
            timestamp: visit.timestamp, // This is a Firestore timestamp
          }),
        })),
      });

      // Mock the document reference chain for sites
      mockCollection.doc.mockImplementation((siteId: string) => ({
        id: siteId,
        get: async () => ({
          exists: true,
          id: siteId,
          data: () => {
            const siteData = sites[siteId as keyof typeof sites];
            if (!siteData) {
              return null;
            }
            return {
              domain: siteData.domain,
              fingerprintId: siteData.fingerprintId,
              lastVisited: siteData.lastVisited, // This is a Firestore timestamp
              createdAt: siteData.createdAt, // This is a Firestore timestamp
              title: siteData.title,
              visits: siteData.visits,
              settings: siteData.settings,
            };
          },
        }),
      }));

      const result = await getVisitHistory(fingerprintId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: visits[0].id,
        fingerprintId: visits[0].fingerprintId,
        url: visits[0].url,
        title: visits[0].title,
        siteId: visits[0].siteId,
        timestamp: mockNow.toMillis(), // Expect Unix timestamp in response
        site: {
          id: "site-1",
          domain: "example.com",
          fingerprintId,
          title: "Example Site 1",
          visits: 5,
          lastVisited: mockNow.toMillis(), // Expect Unix timestamp in response
          createdAt: mockPast.toMillis(), // Expect Unix timestamp in response
          settings: { notifications: true, privacy: "private" },
        },
      });

      // Verify second visit
      expect(result[1]).toMatchObject({
        id: visits[1].id,
        fingerprintId: visits[1].fingerprintId,
        url: visits[1].url,
        title: visits[1].title,
        siteId: visits[1].siteId,
        timestamp: mockPast.toMillis(), // Expect Unix timestamp in response
        site: {
          id: "site-2",
          domain: "example.com",
          fingerprintId,
          title: "Example Site 2",
          visits: 3,
          lastVisited: mockPast.toMillis(), // Expect Unix timestamp in response
          createdAt: mockPast.toMillis(), // Expect Unix timestamp in response
          settings: { notifications: true, privacy: "private" },
        },
      });
    });

    it("should handle missing site information", async () => {
      const fingerprintId = "test-fingerprint";
      const mockNow = MockTimestamp.now();

      const visits = [
        {
          id: "visit-1",
          fingerprintId,
          url: "https://example.com/page1",
          title: "Page 1",
          siteId: "site-1",
          timestamp: mockNow,
        },
      ];

      // Mock visits query
      mockCollection.get.mockResolvedValueOnce({
        docs: visits.map((visit) => ({
          id: visit.id,
          data: () => visit,
        })),
      });

      // Mock missing site
      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getVisitHistory(fingerprintId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...visits[0],
        timestamp: mockNow.toMillis(),
      });
    });

    it("should handle database index errors", async () => {
      const fingerprintId = "test-fingerprint";
      const error = {
        code: 9,
        message: "The query requires an index.",
      };

      mockCollection.get.mockRejectedValueOnce(error);

      await expect(getVisitHistory(fingerprintId)).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.DATABASE_NOT_READY),
      );
    });
  });

  describe("removeSiteAndVisits", () => {
    it("should remove a site and all its visits", async () => {
      const fingerprintId = "test-fingerprint";
      const siteId = "test-site-id";

      // Mock site query
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fingerprintId,
          lastVisited: mockFirestoreTimestamp,
        }),
      });

      // Mock visits query
      mockCollection.get.mockResolvedValueOnce({
        docs: [{ ref: { delete: jest.fn() } }, { ref: { delete: jest.fn() } }],
      });

      mockBatch.commit.mockResolvedValueOnce(undefined);

      const result = await removeSiteAndVisits(fingerprintId, siteId);

      expect(result).toEqual({
        fingerprintId,
        siteId,
        timestamp: mockTimestamp,
      });
    });

    it("should throw error for non-existent site", async () => {
      const fingerprintId = "test-fingerprint";
      const siteId = "non-existent";

      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      await expect(removeSiteAndVisits(fingerprintId, siteId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.SITE_NOT_FOUND),
      );
    });

    it("should throw error when site doesn't belong to fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const siteId = "test-site-id";

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fingerprintId: "different-fingerprint",
        }),
      });

      await expect(removeSiteAndVisits(fingerprintId, siteId)).rejects.toThrow(
        new ApiError(403, ERROR_MESSAGES.PERMISSION_REQUIRED),
      );
    });
  });

  describe("updatePresenceStatus", () => {
    it("should update presence status", async () => {
      const fingerprintId = "test-fingerprint";
      const status = "online";
      const mockResult = {
        fingerprintId,
        status,
        lastUpdated: mockTimestamp,
      };

      require("../../services/presenceService").updatePresence.mockResolvedValueOnce(mockResult);

      const result = await updatePresenceStatus(fingerprintId, status);

      expect(require("../../services/presenceService").updatePresence).toHaveBeenCalledWith(
        fingerprintId,
        status,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from URL", () => {
      expect(extractDomain("https://www.example.com/page")).toBe("example.com");
      expect(extractDomain("http://subdomain.example.com")).toBe("subdomain.example.com");
      expect(extractDomain("https://example.com")).toBe("example.com");
    });

    it("should handle invalid URLs", () => {
      expect(extractDomain("invalid-url")).toBe("invalid-url");
      expect(extractDomain("")).toBe("");
    });
  });

  describe("verifyFingerprint", () => {
    it("should verify fingerprint exists", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
      });

      await expect(verifyFingerprint(fingerprintId)).resolves.not.toThrow();
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      await expect(verifyFingerprint(fingerprintId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should throw error when fingerprint doesn't match authenticated id", async () => {
      const fingerprintId = "test-fingerprint";
      const authenticatedId = "different-fingerprint";

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
      });

      await expect(verifyFingerprint(fingerprintId, authenticatedId)).rejects.toThrow(
        new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS),
      );
    });
  });
});
