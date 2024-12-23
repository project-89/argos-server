import { calculateStabilityIndex } from "../../services/stabilityService";
import { getCurrentPrices } from "../../services/priceService";
import { ApiError } from "../../utils/error";

jest.mock("../../services/priceService");

describe("Stability Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateStabilityIndex", () => {
    it("should calculate stability index correctly", async () => {
      const mockPrices = {
        solana: {
          usd: 100,
          usd_24h_change: -5,
        },
      };

      (getCurrentPrices as jest.Mock).mockResolvedValue(mockPrices);

      const result = await calculateStabilityIndex();

      expect(result).toEqual({
        stabilityIndex: 95, // 100 - abs(-5)
        currentPrice: 100,
        priceChange: -5,
        timestamp: expect.any(Number),
      });
      expect(getCurrentPrices).toHaveBeenCalledWith(["solana"]);
    });

    it("should handle missing Solana price data", async () => {
      (getCurrentPrices as jest.Mock).mockResolvedValue({});

      await expect(calculateStabilityIndex()).rejects.toThrow(
        new ApiError(500, "Failed to get Solana price data"),
      );
    });

    it("should handle price service errors", async () => {
      (getCurrentPrices as jest.Mock).mockRejectedValue(new Error("Price service error"));

      await expect(calculateStabilityIndex()).rejects.toThrow(
        new ApiError(500, "Failed to calculate reality stability index"),
      );
    });

    it("should handle extreme price changes", async () => {
      const mockPrices = {
        solana: {
          usd: 100,
          usd_24h_change: -150, // Extreme price change
        },
      };

      (getCurrentPrices as jest.Mock).mockResolvedValue(mockPrices);

      const result = await calculateStabilityIndex();

      expect(result).toEqual({
        stabilityIndex: 0, // Should be clamped to 0
        currentPrice: 100,
        priceChange: -150,
        timestamp: expect.any(Number),
      });
    });
  });
});
