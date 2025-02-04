import { getFirestore } from "firebase-admin/firestore";
import { extractDomain } from "../../utils/request";
import { COLLECTIONS, ERROR_MESSAGES } from "../../constants";
import {
  logVisit,
  getVisitHistory,
  updatePresenceStatus,
  removeSiteAndVisits,
  verifyFingerprint,
} from "../../services/visit.service";
import { ApiError } from "../../utils/error";
import { getCurrentUnixMillis } from "../../utils/timestamp";
import { MockTimestamp } from "../mocks/mockTimestamp";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: () => MockTimestamp.now(),
    fromMillis: (ms: number) => MockTimestamp.fromMillis(ms),
  },
}));

jest.mock("../../utils/timestamp", () => ({
  getCurrentUnixMillis: jest.fn(),
  toUnixMillis: (timestamp: any) => timestamp.toMillis(),
}));

jest.mock("../../services/presence.service", () => ({
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

      const result = await logVisit({
        fingerprintId,
        url,
        title,
        clientIp,
      });

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.SITES);
      expect(mockCollection.where).toHaveBeenCalledWith("domain", "==", "example.com");
      expect(mockCollection.where).toHaveBeenCalledWith("fingerprintId", "==", fingerprintId);

      expect(result).toMatchObject({
        id: visitId,
        visit: {
          fingerprintId,
          url,
          title,
          siteId,
          createdAt: expect.any(Number),
          clientIp,
        },
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
      expect(typeof result.visit.createdAt === "number").toBe(true);
      expect(result.site).toBeDefined();
      if (result.site) {
        expect(typeof result.site.lastVisited === "number").toBe(true);
        expect(typeof result.site.createdAt === "number").toBe(true);
        expect(Date.now() - result.visit.createdAt).toBeLessThan(1000);
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
      const clientIp = "192.168.1.1";
      mockCollection.add.mockResolvedValueOnce({ id: visitId });

      const result = await logVisit({
        fingerprintId,
        url,
        title,
        clientIp,
      });

      expect(mockDoc.update).toHaveBeenCalledWith({
        lastVisited: expect.any(MockTimestamp),
        visits: 6,
        title: title || "example.com",
      });

      expect(result).toMatchObject({
        id: visitId,
        visit: expect.objectContaining({
          fingerprintId,
          url,
          title,
          siteId,
          createdAt: expect.any(Number),
          clientIp,
        }),
        site: expect.objectContaining({
          id: siteId,
          domain: "example.com",
          fingerprintId,
          title: existingSite.title,
          visits: 6,
          settings: expect.objectContaining({
            notifications: true,
            privacy: "private",
          }),
          lastVisited: expect.any(Number),
          createdAt: expect.any(Number),
        }),
      });

      // Verify timestamps
      expect(typeof result.visit.createdAt === "number").toBe(true);
      expect(result.site).toBeDefined();
      if (result.site) {
        expect(typeof result.site.lastVisited === "number").toBe(true);
        expect(typeof result.site.createdAt === "number").toBe(true);
        expect(Date.now() - result.visit.createdAt).toBeLessThan(1000);
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
          createdAt: mockNow,
        },
        {
          id: "visit-2",
          fingerprintId,
          url: "https://example.com/page2",
          title: "Page 2",
          siteId: "site-2",
          createdAt: mockPast,
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
            createdAt: visit.createdAt,
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
              id: siteId,
              ...siteData,
            };
          },
        }),
      }));

      const result = await getVisitHistory({ fingerprintId });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: visits[0].id,
        fingerprintId: visits[0].fingerprintId,
        url: visits[0].url,
        title: visits[0].title,
        siteId: visits[0].siteId,
        createdAt: mockNow.toMillis(),
        site: {
          id: "site-1",
          domain: "example.com",
          fingerprintId,
          title: "Example Site 1",
          visits: 5,
          lastVisited: mockNow.toMillis(),
          createdAt: mockPast.toMillis(),
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
        createdAt: mockPast.toMillis(),
        site: {
          id: "site-2",
          domain: "example.com",
          fingerprintId,
          title: "Example Site 2",
          visits: 3,
          lastVisited: mockPast.toMillis(),
          createdAt: mockPast.toMillis(),
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
          createdAt: mockNow,
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

      const result = await getVisitHistory({ fingerprintId });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...visits[0],
        createdAt: mockNow.toMillis(),
      });
    });

    it("should handle database index errors", async () => {
      const fingerprintId = "test-fingerprint";
      const error = {
        code: 9,
        message: "The query requires an index.",
      };

      mockCollection.get.mockRejectedValueOnce(error);

      await expect(getVisitHistory({ fingerprintId })).rejects.toThrow(
        ERROR_MESSAGES.INTERNAL_ERROR,
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

      const result = await removeSiteAndVisits({ fingerprintId, siteId });

      expect(result).toEqual({
        fingerprintId,
        siteId,
      });
    });

    it("should throw error for non-existent site", async () => {
      const fingerprintId = "test-fingerprint";
      const siteId = "non-existent";

      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      await expect(removeSiteAndVisits({ fingerprintId, siteId })).rejects.toThrow(
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

      await expect(removeSiteAndVisits({ fingerprintId, siteId })).rejects.toThrow(
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

      require("../../services/presence.service").updatePresence.mockResolvedValueOnce(mockResult);

      const result = await updatePresenceStatus({ fingerprintId, status });

      expect(require("../../services/presence.service").updatePresence).toHaveBeenCalledWith({
        fingerprintId,
        status,
      });
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

      await expect(verifyFingerprint({ fingerprintId })).resolves.not.toThrow();
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValueOnce({
        exists: false,
      });

      await expect(verifyFingerprint({ fingerprintId })).rejects.toThrow(
        ApiError.from(null, 404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should throw error when fingerprint doesn't match authenticated id", async () => {
      const fingerprintId = "test-fingerprint";
      const authenticatedId = "different-fingerprint";

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
      });

      await expect(verifyFingerprint({ fingerprintId, authenticatedId })).rejects.toThrow(
        ApiError.from(null, 403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS),
      );
    });
  });
});
