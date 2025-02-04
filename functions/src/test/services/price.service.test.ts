import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../../constants";
import { getCurrentPrices, getPriceHistory } from "../../services/price.service";

jest.mock("node-fetch", () => {
  return jest.fn();
});

// Get the mocked fetch function
const mockFetch = jest.requireMock("node-fetch");

describe("Price Service", () => {
  const db = getFirestore();
  const testSymbol = "project89";
  const testPrice = {
    usd: 50000,
    usd_24h_change: 2.5,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("getCurrentPrices", () => {
    it("should get prices from cache if available and not expired", async () => {
      // Setup cache
      const now = Timestamp.now();
      await db.collection(COLLECTIONS.PRICE_CACHE).doc(testSymbol).set({
        usd: testPrice.usd,
        usd_24h_change: testPrice.usd_24h_change,
        createdAt: now,
      });

      const result = await getCurrentPrices([testSymbol]);
      expect(result.prices[testSymbol]).toEqual(testPrice);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch prices from API if cache is expired", async () => {
      // Setup expired cache
      const expired = Timestamp.fromMillis(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      await db.collection(COLLECTIONS.PRICE_CACHE).doc(testSymbol).set({
        usd: 45000, // Old price
        usd_24h_change: 1.5,
        createdAt: expired,
      });

      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ [testSymbol]: testPrice }),
      });

      const result = await getCurrentPrices([testSymbol]);
      expect(result.prices[testSymbol]).toEqual(testPrice);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify cache was updated
      const cacheDoc = await db.collection(COLLECTIONS.PRICE_CACHE).doc(testSymbol).get();
      const cacheData = cacheDoc.data();
      expect(cacheData?.usd).toBe(testPrice.usd);
      expect(cacheData?.usd_24h_change).toBe(testPrice.usd_24h_change);
      expect(cacheData?.createdAt).toBeInstanceOf(Timestamp);
    });

    it("should fetch prices from API if not in cache", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ [testSymbol]: testPrice }),
      });

      const result = await getCurrentPrices([testSymbol]);
      expect(result.prices[testSymbol]).toEqual(testPrice);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should use default tokens if none provided", async () => {
      // Mock API response with project89 price data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            project89: {
              usd: testPrice.usd,
              usd_24h_change: testPrice.usd_24h_change,
            },
          }),
      });

      const result = await getCurrentPrices();
      expect(result.prices["project89"]).toEqual(testPrice);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getCurrentPrices([testSymbol]);
      expect(result.errors[testSymbol]).toBe(ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE);
      expect(Object.keys(result.prices)).toHaveLength(0);
    });

    it("should handle missing price data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await getCurrentPrices([testSymbol]);
      expect(result.errors[testSymbol]).toBe(ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
      expect(Object.keys(result.prices)).toHaveLength(0);
    });

    it("should handle multiple tokens with partial failures", async () => {
      const secondSymbol = "other-token";
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ [testSymbol]: testPrice }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await getCurrentPrices([testSymbol, secondSymbol]);
      expect(result.prices[testSymbol]).toEqual(testPrice);
      expect(result.errors[secondSymbol]).toBe(ERROR_MESSAGES.PRICE_DATA_NOT_FOUND);
    });
  });

  describe("getPriceHistory", () => {
    const testHistory = [
      [1641024000000, 47000],
      [1641110400000, 48000],
      [1641196800000, 49000],
    ];

    it("should fetch price history from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prices: testHistory }),
      });

      const history = await getPriceHistory(testSymbol);
      expect(history).toHaveLength(testHistory.length);
      expect(history[0]).toEqual({
        createdAt: Timestamp.fromMillis(testHistory[0][0]),
        price: testHistory[0][1],
      });
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(
        ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE,
      );
    });

    it("should handle 404 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(ERROR_MESSAGES.TOKEN_NOT_FOUND);
    });

    it("should handle rate limit responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
    });

    it("should handle invalid response data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prices: null }),
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(ERROR_MESSAGES.INVALID_REQUEST);
    });
  });
});
