import { calculateStabilityIndex } from "../../services/realityStability.service";
import { getCurrentPrices } from "../../services/price.service";
import { ApiError } from "../../utils/error";
import { ERROR_MESSAGES } from "../../constants/api";

jest.mock("../../services/priceService");
const mockGetCurrentPrices = getCurrentPrices as jest.Mock;

describe("Stability Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateStabilityIndex", () => {
    it("should calculate stability index correctly for negative changes", async () => {
      const mockPrices = {
        project89: {
          usd: 1.0,
          usd_24h_change: -5,
        },
      };

      mockGetCurrentPrices.mockResolvedValue(mockPrices);

      const result = await calculateStabilityIndex();

      expect(result).toEqual({
        stabilityIndex: 100, // Negative changes restore full stability
        currentPrice: 1.0,
        priceChange: -5,
        timestamp: expect.any(Number),
      });
      expect(getCurrentPrices).toHaveBeenCalledWith(["project89"]);
    });

    it("should handle missing token price data", async () => {
      mockGetCurrentPrices.mockResolvedValue({});

      await expect(calculateStabilityIndex()).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.FAILED_GET_TOKEN_PRICE),
      );
    });

    it("should handle price service errors", async () => {
      mockGetCurrentPrices.mockRejectedValue(new Error("Price service error"));

      await expect(calculateStabilityIndex()).rejects.toThrow(
        new ApiError(500, ERROR_MESSAGES.INTERNAL_ERROR),
      );
    });

    it("should handle positive price changes correctly", async () => {
      const mockPrices = {
        project89: {
          usd: 1.0,
          usd_24h_change: 50, // 50% increase
        },
      };

      mockGetCurrentPrices.mockResolvedValue(mockPrices);

      const result = await calculateStabilityIndex();

      expect(result.stabilityIndex).toBeGreaterThan(89);
      expect(result.stabilityIndex).toBeLessThan(100);
      expect(result.currentPrice).toBe(1.0);
      expect(result.priceChange).toBe(50);
      expect(result.timestamp).toEqual(expect.any(Number));
    });

    it("should handle extreme positive price changes", async () => {
      const mockPrices = {
        project89: {
          usd: 1.0,
          usd_24h_change: 200, // 200% increase
        },
      };

      mockGetCurrentPrices.mockResolvedValue(mockPrices);

      const result = await calculateStabilityIndex();

      expect(result.stabilityIndex).toBe(89); // Maximum instability
      expect(result.currentPrice).toBe(1.0);
      expect(result.priceChange).toBe(200);
      expect(result.timestamp).toEqual(expect.any(Number));
    });
  });
});
