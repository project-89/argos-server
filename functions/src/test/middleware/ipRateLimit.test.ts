import { Request, Response, NextFunction } from "express";
import { ipRateLimit } from "../../middleware/ipRateLimit.middleware";

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

describe("IP Rate Limit Test Suite", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock<void, [any?]>;
  let requestStore: { [key: string]: number[] } = {};

  beforeEach(() => {
    mockRequest = {
      headers: {
        "x-forwarded-for": "192.168.1.1",
      },
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
      const ip = mockRequest.headers?.["x-forwarded-for"] as string;
      const transaction = {
        get: jest.fn().mockResolvedValue({
          data: () => ({
            requests: requestStore[ip] || [],
          }),
        }),
        set: jest.fn().mockImplementation((_, data) => {
          requestStore[ip] = data.requests;
        }),
      };
      return callback(transaction);
    });
  });

  it("should enforce IP-based rate limits", async () => {
    // Override the rate limit to 100 for faster testing
    const middleware = ipRateLimit({ max: 100 });
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

      await middleware(mockRequest as Request, response as Response, nextFunction as NextFunction);

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

  it("should track rate limits separately for different IPs", async () => {
    const middleware = ipRateLimit({ max: 100 });
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";

    // Make 75 requests from IP1
    for (let i = 0; i < 75; i++) {
      mockRequest.headers = { "x-forwarded-for": ip1 };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
    }

    // Make 75 requests from IP2
    for (let i = 0; i < 75; i++) {
      mockRequest.headers = { "x-forwarded-for": ip2 };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as NextFunction,
      );
    }

    // Both should succeed as they're under their individual limits
    expect(nextFunction).toHaveBeenCalledTimes(150);
  });
});
