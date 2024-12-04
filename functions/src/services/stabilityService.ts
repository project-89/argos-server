export type MatrixIntegrity = "STABLE" | "FLUCTUATING" | "UNSTABLE" | "CRITICAL";

interface PriceData {
  usd: number;
  usd_24h_change?: number;
}

const calculateResistanceLevel = (price: number, volatility: number): number => {
  const baseResistance = 0.5;
  const volatilityImpact = Math.min(volatility * 0.1, 0.3);
  return baseResistance + volatilityImpact;
};

const determineMatrixIntegrity = (stabilityIndex: number): MatrixIntegrity => {
  if (stabilityIndex >= 0.8) return "STABLE";
  if (stabilityIndex >= 0.6) return "FLUCTUATING";
  if (stabilityIndex >= 0.4) return "UNSTABLE";
  return "CRITICAL";
};

export const calculateStabilityIndex = async (prices: Record<string, PriceData>) => {
  const solanaPrice = prices["solana"]?.usd;
  const solanaPriceChange = prices["solana"]?.usd_24h_change || 0;

  if (!solanaPrice) {
    throw new Error("Failed to fetch Solana price data");
  }

  // Calculate short-term change (24h)
  const shortTermChange = solanaPriceChange / 100; // Convert percentage to decimal

  // Calculate medium-term change (7d) - using short term for now
  const mediumTermChange = shortTermChange * 0.7;

  // Calculate recent volatility
  const recentVolatility = Math.abs(shortTermChange);

  // Calculate resistance level
  const resistanceLevel = calculateResistanceLevel(solanaPrice, recentVolatility);
  const resistanceImpact = Math.min(resistanceLevel * 0.2, 0.4);

  // Simulate quantum response (random factor)
  const simulationResponse = Math.random();

  // Calculate final stability index
  const stabilityFactors = [
    1 - Math.abs(shortTermChange) * 0.3,
    1 - Math.abs(mediumTermChange) * 0.2,
    1 - recentVolatility * 0.2,
    1 - resistanceImpact,
    simulationResponse * 0.1,
  ];

  const realityStabilityIndex =
    stabilityFactors.reduce((a, b) => a + b, 0) / stabilityFactors.length;

  // Determine matrix integrity
  const matrixIntegrity = determineMatrixIntegrity(realityStabilityIndex);

  return {
    realityStabilityIndex,
    resistanceLevel,
    metadata: {
      currentPrice: solanaPrice,
      shortTermChange,
      mediumTermChange,
      recentVolatility,
      resistanceImpact,
      simulationResponse,
      matrixIntegrity,
      timestamp: Date.now(),
    },
  };
};
