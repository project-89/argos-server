const { getTokenPrice } = require("../services/priceService");

/**
 * Calculates Reality Stability Index based on Project89 token price movements
 * Represents Oneirocom's control over the simulation, with resistance from Project89
 */
exports.calculateRealityStabilityIndex = async (req, res) => {
  try {
    const shortTermPrices = await getTokenPrice("89", "1h", "1m");
    const mediumTermPrices = await getTokenPrice("89", "24h", "15m");

    // Constants representing simulation parameters
    const MAXIMUM_STABILITY = 99.99; // Perfect simulation control
    const MINIMUM_STABILITY = 89.0; // Critical simulation instability
    const BASE_RESISTANCE = 0.01; // Minimum resistance level

    // Default response for insufficient data
    if (!shortTermPrices || shortTermPrices.length < 2) {
      return res.status(200).json({
        realityStabilityIndex: MAXIMUM_STABILITY,
        resistanceLevel: BASE_RESISTANCE,
        metadata: {
          currentPrice: 0,
          shortTermChange: 0,
          mediumTermChange: 0,
          recentVolatility: 0,
          resistanceImpact: BASE_RESISTANCE,
          simulationResponse: 0,
          matrixIntegrity: "STABLE",
          timestamp: Date.now(),
        },
      });
    }

    // Calculate price changes
    const currentPrice = shortTermPrices[shortTermPrices.length - 1].price;
    const hourAgoPrice = shortTermPrices[0].price;
    const dayAgoPrice = mediumTermPrices[0].price;

    const shortTermChange = ((currentPrice - hourAgoPrice) / hourAgoPrice) * 100;
    const mediumTermChange = ((currentPrice - dayAgoPrice) / dayAgoPrice) * 100;

    // Calculate volatility
    const recentPrices = shortTermPrices.slice(-15);
    const volatility = calculateVolatility(recentPrices.map((p) => p.price));

    // Start with maximum stability
    let stabilityScore = MAXIMUM_STABILITY;

    // Calculate resistance impact - exponentially stronger for price increases
    let resistanceImpact = BASE_RESISTANCE;
    if (shortTermChange > 0 || mediumTermChange > 0) {
      // Scale the resistance based on price ranges
      let priceThreshold;
      if (currentPrice < 0.01) {
        priceThreshold = 1000; // Much higher tolerance for micro prices
      } else if (currentPrice < 1.0) {
        priceThreshold = 500; // Higher tolerance for sub-$1 prices
      } else {
        priceThreshold = 100; // Standard threshold for $1+ prices
      }

      // More aggressive resistance scaling for large price movements
      const shortTermResistance = Math.pow(1 + Math.abs(shortTermChange) / priceThreshold, 2) * 3;
      const mediumTermResistance =
        Math.pow(1 + Math.abs(mediumTermChange) / priceThreshold, 2.2) * 2;

      resistanceImpact = Math.min(
        BASE_RESISTANCE + Math.max(shortTermResistance, mediumTermResistance),
        8.5,
      );
    }

    // Apply resistance impact more gradually
    let extremeThreshold;
    if (currentPrice < 0.01) {
      extremeThreshold = 500; // Much higher threshold for micro prices
    } else if (currentPrice < 1.0) {
      extremeThreshold = 300; // Higher threshold for sub-$1 prices
    } else {
      extremeThreshold = 50; // Standard threshold for $1+ prices
    }

    const resistanceMultiplier = shortTermChange > extremeThreshold ? 1.2 : 1.0;
    stabilityScore -= resistanceImpact * resistanceMultiplier;

    // Calculate simulation response (fighting back)
    const simulationResponse = calculateSimulationResponse(
      stabilityScore,
      shortTermChange,
      volatility,
      currentPrice,
    );

    // Reduce simulation response effectiveness during extreme surges
    const responseLimit = shortTermChange > extremeThreshold ? 0.8 : 1.5;
    stabilityScore += Math.min(simulationResponse, shortTermChange < 0 ? 3.0 : responseLimit);

    // Ensure score stays within bounds
    stabilityScore = Math.max(MINIMUM_STABILITY, Math.min(MAXIMUM_STABILITY, stabilityScore));

    // Determine matrix integrity status
    const matrixIntegrity = determineMatrixIntegrity(stabilityScore);

    return res.status(200).json({
      realityStabilityIndex: Math.round(stabilityScore * 100) / 100,
      resistanceLevel: Math.round(resistanceImpact * 100) / 100,
      metadata: {
        currentPrice,
        shortTermChange: Math.round(shortTermChange * 100) / 100,
        mediumTermChange: Math.round(mediumTermChange * 100) / 100,
        recentVolatility: Math.round(volatility * 100) / 100,
        resistanceImpact: Math.round(resistanceImpact * 100) / 100,
        simulationResponse: Math.round(simulationResponse * 100) / 100,
        matrixIntegrity,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error calculating Reality Stability Index:", error);
    return res.status(500).json({ error: "Failed to calculate stability index" });
  }
};

/**
 * Calculates how strongly the simulation fights back against resistance
 */
function calculateSimulationResponse(currentStability, priceChange, volatility, currentPrice) {
  // Adjusted base response rate
  const baseResponse = 0.3;

  // More gradual exponential response
  const urgencyMultiplier = Math.exp((100 - currentStability) / 6);

  // Enhanced recovery for price drops
  const priceChangeMultiplier =
    priceChange > 0
      ? 0.4 // Weaker response to price increases
      : 2.5; // Stronger response to price decreases

  // Price-aware volatility impact
  const volatilityMultiplier = 1 + volatility / (currentPrice < 1.0 ? 200 : 150);

  return baseResponse * urgencyMultiplier * priceChangeMultiplier * volatilityMultiplier;
}

/**
 * Determines the current state of matrix integrity based on stability score
 */
function determineMatrixIntegrity(stabilityScore) {
  if (stabilityScore >= 99) {
    return "OPTIMAL";
  }
  if (stabilityScore >= 95) {
    return "STABLE";
  }
  if (stabilityScore >= 92) {
    return "DEGRADED";
  }
  if (stabilityScore >= 89) {
    return "COMPROMISED";
  }
  return "CRITICAL"; // Below 89%
}

function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const squaredDiffs = returns.map((ret) => Math.pow(ret - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;

  return Math.sqrt(variance) * 100;
}
