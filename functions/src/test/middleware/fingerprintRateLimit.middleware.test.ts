import "../setup/jest.setup";
import { Request, Response, NextFunction } from "express";
import { fingerprintRateLimit } from "../../middleware/fingerprintRateLimit.middleware";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { cleanDatabase } from "../utils/testUtils";
import { COLLECTIONS } from "../../constants";

// Extend Request type to include fingerprintId
interface AuthenticatedRequest extends Request {
  fingerprintId?: string;
}

// Mock request object
let mockRequest: Partial<AuthenticatedRequest & { path: string }>;
let mockResponse: Partial<Response>;
let nextFunction: jest.Mock<void, [any?]>;

describe("Fingerprint Rate Limit Test Suite", () => {
  beforeEach(async () => {
    // Clean the database before each test
    await cleanDatabase();

    // Set up Express mocks
    mockRequest = {
      headers: {},
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
      const fingerprintId = "test-fingerprint";

      // Create rate limit document with requests below limit
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprintId}`)
        .set({
          requests: Array(999).fill(Timestamp.now()), // One less than limit
          lastUpdated: Timestamp.now(),
        });

      const middleware = fingerprintRateLimit({ max: 1000, windowMs: 3600000 });
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      // Verify request was added
      const doc = await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprintId}`)
        .get();
      const data = doc.data();
      expect(data?.requests.length).toBe(1000);
    });

    it("should block requests over rate limit", async () => {
      const db = getFirestore();
      const fingerprintId = "test-fingerprint";

      // Create rate limit document at limit
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprintId}`)
        .set({
          requests: Array(1000).fill(Timestamp.now()),
          lastUpdated: Timestamp.now(),
        });

      const middleware = fingerprintRateLimit({ max: 1000, windowMs: 3600000 });
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
      const fingerprintId = "test-fingerprint";
      const oldTime = Timestamp.fromMillis(Date.now() - 3600000); // 1 hour ago

      // Create rate limit document with old requests
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprintId}`)
        .set({
          requests: Array(1000).fill(oldTime),
          lastUpdated: oldTime,
        });

      const middleware = fingerprintRateLimit({ max: 1000, windowMs: 3600000 });
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();

      // Verify old requests were cleaned up
      const doc = await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprintId}`)
        .get();
      const data = doc.data();
      expect(data?.requests.length).toBe(1); // Only the new request remains
    });
  });

  describe("Fingerprint Handling", () => {
    it("should skip rate limiting if no fingerprint is provided", async () => {
      const middleware = fingerprintRateLimit({ max: 1000, windowMs: 3600000 });

      // Remove fingerprintId from request
      mockRequest.fingerprintId = undefined;

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should track rate limits separately for different fingerprints", async () => {
      const db = getFirestore();
      const fingerprint1 = "test-fingerprint-1";
      const fingerprint2 = "test-fingerprint-2";

      // Set up initial rate limit for fingerprint1
      await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprint1}`)
        .set({
          requests: Array(999).fill(Timestamp.now()),
          lastUpdated: Timestamp.now(),
        });

      const middleware = fingerprintRateLimit({ max: 1000, windowMs: 3600000 });

      // Test fingerprint1 (should succeed)
      mockRequest.fingerprintId = fingerprint1;
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();

      // Test fingerprint2 (should succeed as it's a different fingerprint)
      mockRequest.fingerprintId = fingerprint2;
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
      expect(nextFunction).toHaveBeenCalledTimes(2);

      // Verify separate tracking
      const doc1 = await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprint1}`)
        .get();
      const doc2 = await db
        .collection(COLLECTIONS.RATE_LIMITS)
        .doc(`fingerprint:${fingerprint2}`)
        .get();

      expect(doc1.data()?.requests.length).toBe(1000); // 999 + 1 new request
      expect(doc2.data()?.requests.length).toBe(1); // Just the new request
    });
  });
});
