// THIS IS FOR TESTING ONLY
// First create a mock module
const priceServiceMock = {
  getTokenPrice: async (token, period) => {
    // This will be dynamically updated in testScenario
    return priceServiceMock._prices[period];
  },
  _prices: {
    "1h": [],
    "24h": [],
  },
};

// Override the module resolution
require.cache[require.resolve("../services/priceService")] = {
  exports: priceServiceMock,
};

// Now load the main module after the mock is in place
const { calculateRealityStabilityIndex } = require("../endpoints/realityStabilityIndex");

// Mock response object
const mockRes = {
  status: function (code) {
    this.statusCode = code;
    return this;
  },
  json: function (data) {
    this.data = data;
    return this;
  },
};

// Test scenarios
async function runSimulations() {
  console.log("\n=== Reality Stability Index Simulations ===\n");

  // Scenario 1: Steady upward movement
  await testScenario(
    "Steady Upward Movement (5% per hour)",
    generatePrices(100, 15, 5), // 5% increase per period
    generatePrices(100, 96, 5),
  );

  // Scenario 2: Sharp price spike
  await testScenario(
    "Sharp Price Spike (20% in 1 hour)",
    generatePrices(100, 15, 20),
    generatePrices(100, 96, 5),
  );

  // Scenario 3: Price crash
  await testScenario(
    "Price Crash (-30% in 1 hour)",
    generatePrices(100, 15, -30),
    generatePrices(100, 96, -10),
  );

  // Scenario 4: High volatility
  await testScenario(
    "High Volatility",
    generateVolatilePrices(100, 15, 10),
    generateVolatilePrices(100, 96, 15),
  );

  // Scenario 5: Extreme surge
  await testScenario(
    "Extreme Price Surge (100% in 1 hour)",
    generatePrices(100, 15, 100),
    generatePrices(100, 96, 50),
  );
}

// Helper function to generate price data
function generatePrices(basePrice, count, percentageChange) {
  const prices = [];
  const changePerPeriod = percentageChange / count;

  for (let i = 0; i < count; i++) {
    const change = 1 + changePerPeriod / 100;
    const price = basePrice * Math.pow(change, i);
    prices.push({
      price,
      timestamp: Date.now() - (count - i) * 60000,
    });
  }
  return prices;
}

// Helper function to generate volatile prices
function generateVolatilePrices(basePrice, count, volatilityPercent) {
  const prices = [];
  for (let i = 0; i < count; i++) {
    const randomChange = (Math.random() - 0.5) * 2 * volatilityPercent;
    const price = basePrice * (1 + randomChange / 100);
    prices.push({
      price,
      timestamp: Date.now() - (count - i) * 60000,
    });
  }
  return prices;
}

// Test individual scenario
async function testScenario(name, shortTermPrices, mediumTermPrices) {
  console.log(`\nTesting Scenario: ${name}`);
  console.log("----------------------------------------");

  // Update the mock data
  priceServiceMock._prices["1h"] = shortTermPrices;
  priceServiceMock._prices["24h"] = mediumTermPrices;

  const res = Object.create(mockRes);
  await calculateRealityStabilityIndex({}, res);

  if (!res.data) {
    console.error("No data returned from calculation");
    return;
  }

  // Display results with better formatting
  console.log("\nResults:");
  console.log("----------------------------------------");
  console.log(`Reality Stability Index: ${res.data.realityStabilityIndex.toFixed(2)}%`);
  console.log(`Resistance Level: ${res.data.resistanceLevel.toFixed(2)}%`);
  console.log(`Matrix Integrity: ${res.data.metadata.matrixIntegrity}`);
  console.log("\nMetadata:");
  console.log(`- Short Term Change: ${res.data.metadata.shortTermChange.toFixed(2)}%`);
  console.log(`- Medium Term Change: ${res.data.metadata.mediumTermChange.toFixed(2)}%`);
  console.log(`- Volatility: ${res.data.metadata.recentVolatility.toFixed(2)}%`);
  console.log(`- Simulation Response: ${res.data.metadata.simulationResponse.toFixed(2)}`);
  console.log("----------------------------------------\n");
}

// Run all simulations
runSimulations().catch(console.error);
