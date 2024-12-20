import { Request, Response, NextFunction } from "express";
import { fingerprintRateLimit } from "../../middleware/fingerprintRateLimit.middleware";

// Mock Firestore
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  runTransaction: jest.fn(),
  batch: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    docs: [],
  }),
  delete: jest.fn(),
  commit: jest.fn(),
  add: jest.fn().mockResolvedValue({
    id: "test-doc",
    delete: jest.fn().mockResolvedValue(true),
  }),
};

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
    },
  },
}));

// Mock Firebase Admin Firestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockFirestore,
  FieldValue: {
    serverTimestamp: () => new Date(),
  },
}));

// Bypass test environment initialization
jest.mock("../utils/testUtils", () => ({
  initializeTestEnvironment: jest.fn().mockResolvedValue(mockFirestore),
  cleanDatabase: jest.fn().mockResolvedValue(true),
}));

// Extend Request type to include fingerprint
interface RequestWithFingerprint extends Request {
  fingerprint?: { id: string };
  fingerprintId?: string;
}

describe("Fingerprint Rate Limit Test Suite", () => {
  let mockRequest: Partial<RequestWithFingerprint>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock<void, [any?]>;
  let requestStore: { [key: string]: number[] } = {};

  beforeEach(() => {
    mockRequest = {
      headers: {},
      fingerprint: { id: "test-fingerprint" },
      fingerprintId: "test-fingerprint",
      path: "/test",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn(),
      send: jest.fn(),
    } as Partial<Response>;
    nextFunction = jest.fn();
    requestStore = {};

    // Mock Firestore transaction
    mockFirestore.runTransaction.mockImplementation(async (callback) => {
      const fingerprintId = mockRequest.fingerprintId as string;
      const transaction = {
        get: jest.fn().mockResolvedValue({
          data: () => ({
            requests: requestStore[fingerprintId] || [],
          }),
        }),
        set: jest.fn().mockImplementation((_, data) => {
          requestStore[fingerprintId] = data.requests;
        }),
      };
      return callback(transaction);
    });
  });

  it("should enforce fingerprint-based rate limits", async () => {
    // Override the rate limit to 100 for faster testing
    const middleware = fingerprintRateLimit({ max: 100 });
    const successResponses: any[] = [];
    const limitedResponses: any[] = [];
    const otherResponses: any[] = [];

    // Make 102 requests (100 should succeed, 2 should be limited)
    for (let i = 0; i < 102; i++) {
      const statusFn = jest.fn().mockReturnThis();
      const response = {
        status: statusFn,
        json: jest.fn(),
        sendStatus: jest.fn(),
        send: jest.fn(),
      } as Partial<Response>;

      await middleware(
        mockRequest as RequestWithFingerprint,
        response as Response,
        nextFunction as NextFunction,
      );

      if (nextFunction.mock.calls.length > successResponses.length) {
        successResponses.push(response);
      } else if (statusFn.mock.calls[0]?.[0] === 429) {
        limitedResponses.push(response);
      } else {
        otherResponses.push(response);
      }
    }

    // We expect exactly 100 successful requests and 2 rate-limited ones
    expect(successResponses.length).toBe(100);
    expect(limitedResponses.length).toBe(2);
    expect(otherResponses.length).toBe(0);
  });

  it("should track rate limits separately for different fingerprints", async () => {
    const middleware = fingerprintRateLimit({ max: 100 });
    const fingerprint1 = { id: "test-fingerprint-1" };
    const fingerprint2 = { id: "test-fingerprint-2" };

    // Make 75 requests for fingerprint1
    for (let i = 0; i < 75; i++) {
      mockRequest.fingerprint = fingerprint1;
      mockRequest.fingerprintId = fingerprint1.id;
      await middleware(
        mockRequest as RequestWithFingerprint,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
    }

    // Make 75 requests for fingerprint2
    for (let i = 0; i < 75; i++) {
      mockRequest.fingerprint = fingerprint2;
      mockRequest.fingerprintId = fingerprint2.id;
      await middleware(
        mockRequest as RequestWithFingerprint,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
    }

    // Both should succeed as they're under their individual limits
    expect(nextFunction).toHaveBeenCalledTimes(150);
  });
});
