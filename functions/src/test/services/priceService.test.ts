import { getFirestore, Timestamp } from "firebase-admin/firestore";
import axios from "axios";
import { COLLECTIONS } from "../../constants/collections";
import { getCurrentPrices, getPriceHistory } from "../../services/priceService";
import { ApiError } from "../../utils/error";
import { cleanDatabase } from "../utils/testUtils";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Price Service", () => {
  const db = getFirestore();
  const testSymbol = "bitcoin";
  const testPrice = {
    usd: 50000,
    usd_24h_change: 2.5,
  };

  beforeEach(async () => {
    await cleanDatabase();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanDatabase();
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

      const prices = await getCurrentPrices([testSymbol]);
      expect(prices[testSymbol]).toEqual(testPrice);
      expect(mockedAxios.get).not.toHaveBeenCalled();
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
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          [testSymbol]: testPrice,
        },
      });

      const prices = await getCurrentPrices([testSymbol]);
      expect(prices[testSymbol]).toEqual(testPrice);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Verify cache was updated
      const cacheDoc = await db.collection(COLLECTIONS.PRICE_CACHE).doc(testSymbol).get();
      const cacheData = cacheDoc.data();
      expect(cacheData?.usd).toBe(testPrice.usd);
      expect(cacheData?.usd_24h_change).toBe(testPrice.usd_24h_change);
      expect(cacheData?.createdAt).toBeInstanceOf(Timestamp);
    });

    it("should fetch prices from API if not in cache", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          [testSymbol]: testPrice,
        },
      });

      const prices = await getCurrentPrices([testSymbol]);
      expect(prices[testSymbol]).toEqual(testPrice);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it("should use default tokens if none provided", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          bitcoin: testPrice,
          ethereum: { ...testPrice, usd: 3000 },
        },
      });

      const prices = await getCurrentPrices();
      expect(Object.keys(prices)).toContain("bitcoin");
      expect(Object.keys(prices)).toContain("ethereum");
    });

    it("should handle API errors gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(getCurrentPrices([testSymbol])).rejects.toThrow(ApiError);
    });

    it("should handle missing price data", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {},
      });

      await expect(getCurrentPrices([testSymbol])).rejects.toThrow(ApiError);
    });
  });

  describe("getPriceHistory", () => {
    const testHistory = [
      [1641024000000, 47000],
      [1641110400000, 48000],
      [1641196800000, 49000],
    ];

    it("should fetch price history from API", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prices: testHistory,
          }),
      });

      const history = await getPriceHistory(testSymbol);
      expect(history).toHaveLength(testHistory.length);
      expect(history[0]).toEqual({
        createdAt: Timestamp.fromMillis(testHistory[0][0]),
        price: testHistory[0][1],
      });
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error("API Error"));

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(ApiError);
    });

    it("should handle 404 responses", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow("Token not found");
    });

    it("should handle invalid response data", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prices: null,
          }),
      });

      await expect(getPriceHistory(testSymbol)).rejects.toThrow(ApiError);
    });
  });
});
