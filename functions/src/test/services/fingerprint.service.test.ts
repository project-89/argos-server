import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { ROLE } from "../../constants/roles";
import { ERROR_MESSAGES } from "../../constants/api";
import {
  createFingerprint,
  getFingerprintAndUpdateIp,
  verifyFingerprint,
  updateFingerprintMetadata,
  getClientIp,
} from "../../services/fingerprint.service";
import { ApiError } from "../../utils/error";
import { Request } from "express";

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn(),
  },
}));

describe("Fingerprint Service", () => {
  const mockFirestore = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(),
    add: jest.fn(),
  };

  const mockDoc = {
    get: jest.fn(),
    update: jest.fn(),
  };

  const mockTimestamp = {
    toMillis: jest.fn().mockReturnValue(1672531200000), // 2023-01-01T00:00:00.000Z
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    (Timestamp.now as jest.Mock).mockReturnValue(mockTimestamp);
  });

  describe("createFingerprint", () => {
    it("should create a new fingerprint record", async () => {
      const fingerprint = "test-fingerprint";
      const ip = "192.168.1.1";
      const metadata = { test: "data" };
      const docId = "test-doc-id";

      mockCollection.add.mockResolvedValue({ id: docId });

      const result = await createFingerprint(fingerprint, ip, metadata);

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint,
          roles: [ROLE.USER],
          createdAt: mockTimestamp,
          tags: [],
          metadata,
          ipAddresses: [ip],
          ipMetadata: {
            primaryIp: ip,
            ipFrequency: { [ip]: 1 },
            lastSeenAt: { [ip]: mockTimestamp },
          },
        }),
      );

      expect(result).toEqual({
        id: docId,
        fingerprint,
        roles: [ROLE.USER],
        createdAt: mockTimestamp,
        lastVisited: mockTimestamp,
        tags: [],
        metadata,
        ipAddresses: [ip],
        ipMetadata: {
          primaryIp: ip,
          ipFrequency: { [ip]: 1 },
          lastSeenAt: { [ip]: mockTimestamp },
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      const fingerprint = "test-fingerprint";
      const ip = "192.168.1.1";

      mockCollection.add.mockRejectedValue(new Error("Database error"));

      await expect(createFingerprint(fingerprint, ip)).rejects.toThrow("Database error");
    });
  });

  describe("getFingerprintAndUpdateIp", () => {
    it("should update IP information for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const ip = "192.168.1.1";
      const existingData = {
        id: fingerprintId,
        ipAddresses: ["192.168.1.2"],
        ipMetadata: {
          ipFrequency: { "192.168.1.2": 1 },
          lastSeenAt: { "192.168.1.2": mockTimestamp },
          primaryIp: "192.168.1.2",
        },
      };

      mockFirestore.runTransaction.mockImplementation(async (callback) => {
        const transactionResult = await callback({
          get: async () => ({
            exists: true,
            id: fingerprintId,
            data: () => existingData,
          }),
          update: jest.fn(),
        });
        return transactionResult;
      });

      const result = await getFingerprintAndUpdateIp(fingerprintId, ip);

      expect(mockFirestore.collection).toHaveBeenCalledWith(COLLECTIONS.FINGERPRINTS);
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
      expect(result.data).toEqual(
        expect.objectContaining({
          id: fingerprintId,
          ipAddresses: expect.arrayContaining(["192.168.1.1", "192.168.1.2"]),
          ipMetadata: expect.objectContaining({
            ipFrequency: expect.any(Object),
            lastSeenAt: expect.any(Object),
            primaryIp: expect.any(String),
          }),
        }),
      );
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";
      const ip = "192.168.1.1";

      mockFirestore.runTransaction.mockImplementation(async (callback) => {
        await callback({
          get: async () => ({
            exists: false,
          }),
          update: jest.fn(),
        });
      });

      await expect(getFingerprintAndUpdateIp(fingerprintId, ip)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT),
      );
    });
  });

  describe("verifyFingerprint", () => {
    it("should verify fingerprint exists", async () => {
      const fingerprintId = "test-fingerprint";

      mockDoc.get.mockResolvedValue({ exists: true });

      await expect(verifyFingerprint(fingerprintId)).resolves.not.toThrow();
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(verifyFingerprint(fingerprintId)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.INVALID_FINGERPRINT),
      );
    });

    it("should throw error when fingerprint doesn't match authenticated id", async () => {
      const fingerprintId = "test-fingerprint";
      const authenticatedId = "different-fingerprint";

      mockDoc.get.mockResolvedValue({ exists: true });

      await expect(verifyFingerprint(fingerprintId, authenticatedId)).rejects.toThrow(
        new ApiError(403, ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS),
      );
    });
  });

  describe("updateFingerprintMetadata", () => {
    it("should update metadata for existing fingerprint", async () => {
      const fingerprintId = "test-fingerprint";
      const existingMetadata = { existing: "data" };
      const newMetadata = { new: "data" };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: fingerprintId,
        data: () => ({
          metadata: existingMetadata,
        }),
      });

      const result = await updateFingerprintMetadata(fingerprintId, newMetadata);

      expect(mockDoc.update).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          existing: "data",
          new: "data",
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: fingerprintId,
          metadata: expect.objectContaining({
            existing: "data",
            new: "data",
          }),
        }),
      );
    });

    it("should throw error for non-existent fingerprint", async () => {
      const fingerprintId = "non-existent";
      const metadata = { test: "data" };

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(updateFingerprintMetadata(fingerprintId, metadata)).rejects.toThrow(
        new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND),
      );
    });

    it("should handle database errors gracefully", async () => {
      const fingerprintId = "test-fingerprint";
      const metadata = { test: "data" };

      mockDoc.get.mockRejectedValue(new Error("Database error"));

      await expect(updateFingerprintMetadata(fingerprintId, metadata)).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR),
      );
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const req = {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
        get: () => {},
        header: () => {},
        accepts: () => {},
        acceptsCharsets: () => {},
        acceptsEncodings: () => {},
        acceptsLanguages: () => {},
      } as unknown as Request;

      const result = getClientIp(req);
      expect(result).toBe("192.168.1.1");
    });

    it("should fallback to req.ip if x-forwarded-for is not present", () => {
      const req = {
        headers: {},
        ip: "192.168.1.1",
        get: () => {},
        header: () => {},
        accepts: () => {},
        acceptsCharsets: () => {},
        acceptsEncodings: () => {},
        acceptsLanguages: () => {},
      } as unknown as Request;

      const result = getClientIp(req);
      expect(result).toBe("192.168.1.1");
    });

    it("should fallback to socket remote address if other methods fail", () => {
      const req = {
        headers: {},
        ip: undefined,
        socket: {
          remoteAddress: "192.168.1.1",
        },
        get: () => {},
        header: () => {},
        accepts: () => {},
        acceptsCharsets: () => {},
        acceptsEncodings: () => {},
        acceptsLanguages: () => {},
      } as unknown as Request;

      const result = getClientIp(req);
      expect(result).toBe("192.168.1.1");
    });

    it("should return 'unknown' if no IP can be determined", () => {
      const req = {
        headers: {},
        ip: undefined,
        socket: {},
        get: () => {},
        header: () => {},
        accepts: () => {},
        acceptsCharsets: () => {},
        acceptsEncodings: () => {},
        acceptsLanguages: () => {},
      } as unknown as Request;

      const result = getClientIp(req);
      expect(result).toBe("unknown");
    });
  });
});
