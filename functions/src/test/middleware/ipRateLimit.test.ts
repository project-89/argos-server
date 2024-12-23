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
  let requestStore: { [key: string]: { requests: number[]; lastCleanup: Date } } = {};
  let currentTime: Date;

  beforeEach(() => {
    currentTime = new Date();
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

    // Mock Firestore transaction with more realistic behavior
    mockFirestore.runTransaction.mockImplementation(async (callback) => {
      const ip = mockRequest.headers?.["x-forwarded-for"] as string;
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: !!requestStore[ip],
          data: () => {
            // If the store exists, filter out old requests based on currentTime
            if (requestStore[ip]) {
              const windowMs = 1000; // Default window for tests
              const cutoff = new Date(currentTime.getTime() - windowMs);
              requestStore[ip].requests = requestStore[ip].requests.filter(
                (timestamp) => new Date(timestamp).getTime() > cutoff.getTime(),
              );
            }
            return requestStore[ip] || { requests: [], lastCleanup: currentTime };
          },
        }),
        set: jest.fn().mockImplementation((_, data) => {
          requestStore[ip] = {
            requests: data.requests,
            lastCleanup: data.lastCleanup || currentTime,
          };
        }),
      };
      return callback(transaction);
    });
  });

  afterEach(() => {
    requestStore = {};
    jest.clearAllMocks();
  });

  it("should enforce IP-based rate limits", async () => {
    const middleware = ipRateLimit({ max: 100, windowMs: 3600000 });
    const successResponses: any[] = [];
    const limitedResponses: any[] = [];

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
      }
    }

    expect(successResponses.length).toBe(100);
    expect(limitedResponses.length).toBe(2);
    expect(mockFirestore.runTransaction).toHaveBeenCalledTimes(102);
  });

  it("should track rate limits separately for different IPs", async () => {
    const middleware = ipRateLimit({ max: 100, windowMs: 3600000 });
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

    expect(nextFunction).toHaveBeenCalledTimes(150);
    expect(requestStore[ip1].requests.length).toBe(75);
    expect(requestStore[ip2].requests.length).toBe(75);
  });

  it("should reset rate limits after window expires", async () => {
    const windowMs = 1000; // 1 second window
    const middleware = ipRateLimit({ max: 2, windowMs });
    const ip = "192.168.1.1";
    mockRequest.headers = { "x-forwarded-for": ip };

    // Make 2 requests (should succeed)
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    expect(nextFunction).toHaveBeenCalledTimes(2);

    // Make another request (should be limited)
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    expect(nextFunction).toHaveBeenCalledTimes(2);

    // Move time forward past window and update request timestamps
    currentTime = new Date(currentTime.getTime() + windowMs + 100);

    // Make another request (should succeed after window reset)
    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    expect(nextFunction).toHaveBeenCalledTimes(3);
  });

  it("should handle concurrent requests correctly", async () => {
    const middleware = ipRateLimit({ max: 5, windowMs: 1000 });
    const ip = "192.168.1.1";
    mockRequest.headers = { "x-forwarded-for": ip };

    // Simulate 10 concurrent requests
    const requests = Array(10)
      .fill(null)
      .map(() =>
        middleware(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction),
      );

    await Promise.all(requests);
    expect(nextFunction).toHaveBeenCalledTimes(5); // Only first 5 should succeed
  });

  it("should handle database errors gracefully", async () => {
    const middleware = ipRateLimit({ max: 5, windowMs: 1000 });
    mockFirestore.runTransaction.mockRejectedValueOnce(new Error("Database error"));

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    expect(nextFunction).toHaveBeenCalled(); // Should allow request through on error
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it("should handle missing IP address", async () => {
    const middleware = ipRateLimit({ max: 5, windowMs: 1000 });
    mockRequest.headers = {};

    await middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction,
    );
    expect(nextFunction).toHaveBeenCalled(); // Should allow request through
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
