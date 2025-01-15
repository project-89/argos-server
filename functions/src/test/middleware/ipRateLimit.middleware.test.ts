import "../setup/jest.setup";
import { Request, Response, NextFunction } from "express";
import { ipRateLimit } from "../../middleware/ipRateLimit.middleware";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { cleanDatabase } from "../utils/testUtils";
import { COLLECTIONS } from "../../constants/collections";

// Extend Request type to include fingerprintId
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

// Mock request object
let mockRequest: Partial<AuthenticatedRequest & { path: string }>;
let mockResponse: Partial<Response>;
let nextFunction: jest.Mock<void, [any?]>;

describe("IP Rate Limit Test Suite", () => {
  beforeEach(async () => {
    // Clean the database before each test
    await cleanDatabase();

    // Set up Express mocks
    mockRequest = {
      headers: {
        "x-forwarded-for": "192.168.1.1",
      },
      path: "/test",
      fingerprintId: "test-fingerprint",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    nextFunction = jest.fn();

    // Reset mock implementations
    jest.clearAllMocks();
  });

  describe("Basic Rate Limiting", () => {
    it("should allow requests within rate limit", async () => {
      const db = getFirestore();
      const ip = "192.168.1.1";

      // Create rate limit document with requests below limit
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`ip:${ip}`)
        .set({
          requests: Array(299).fill(Timestamp.now()), // One less than limit
          lastUpdated: Timestamp.now(),
        });

      const middleware = ipRateLimit({ max: 300, windowMs: 3600000 });
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      // Verify request was added
      const doc = await db.collection(COLLECTIONS.RATE_LIMITS).doc(`ip:${ip}`).get();
      const data = doc.data();
      expect(data?.requests.length).toBe(300);
    });

    it("should block requests over rate limit", async () => {
      const db = getFirestore();
      const ip = "192.168.1.1";

      // Create rate limit document at limit
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`ip:${ip}`)
        .set({
          requests: Array(300).fill(Timestamp.now()),
          lastUpdated: Timestamp.now(),
        });

      const middleware = ipRateLimit({ max: 300, windowMs: 3600000 });
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Too many requests, please try again later",
        }),
      );
    });

    it("should reset count after window expires", async () => {
      const db = getFirestore();
      const ip = "192.168.1.1";
      const oldTime = Timestamp.fromMillis(Date.now() - 3600000); // 1 hour ago

      // Create rate limit document with old requests
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`ip:${ip}`)
        .set({
          requests: Array(300).fill(oldTime),
          lastUpdated: oldTime,
        });

      const middleware = ipRateLimit({ max: 300, windowMs: 3600000 });
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      // Verify old requests were cleaned up
      const doc = await db.collection(COLLECTIONS.RATE_LIMITS).doc(`ip:${ip}`).get();
      const data = doc.data();
      expect(data?.requests.length).toBe(1); // Only the new request remains
    });
  });

  describe("Suspicious IP Detection", () => {
    it("should detect suspicious IP when using new IP after primary IP is established", async () => {
      const db = getFirestore();
      const now = Timestamp.now();

      // Set up test fingerprint data
      const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc("test-fingerprint");
      await fingerprintRef.set({
        createdAt: Timestamp.fromMillis(now.toMillis() - 25 * 60 * 60 * 1000),
        ipMetadata: {
          ipFrequency: { "192.168.1.1": 15 },
          lastSeenAt: { "192.168.1.1": now },
          primaryIp: "192.168.1.1",
          suspiciousIps: [],
        },
      });

      const middleware = ipRateLimit({ max: 300, windowMs: 3600000 });
      mockRequest.headers = { "x-forwarded-for": "1.2.3.4" };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      // Verify the response
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Suspicious IP activity detected",
        }),
      );

      // Verify the suspicious IP was added
      const updatedDoc = await fingerprintRef.get();
      const updatedData = updatedDoc.data();
      expect(updatedData?.ipMetadata?.suspiciousIps).toContain("1.2.3.4");
    });

    it("should not mark IP as suspicious within initial time window", async () => {
      const db = getFirestore();
      const now = Timestamp.now();

      // Set up test data for recently created fingerprint
      await db
        .collection(COLLECTIONS.FINGERPRINTS)
        .doc("test-fingerprint")
        .set({
          createdAt: Timestamp.fromMillis(now.toMillis() - 12 * 60 * 60 * 1000), // 12 hours ago
          ipMetadata: {
            ipFrequency: { "192.168.1.1": 15 },
            lastSeenAt: { "192.168.1.1": now },
            primaryIp: "192.168.1.1",
            suspiciousIps: [],
          },
        });

      const middleware = ipRateLimit({ max: 300, windowMs: 3600000 });
      mockRequest.headers = { "x-forwarded-for": "1.2.3.4" };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Suspicious IP activity detected",
        }),
      );
    });
  });
});
