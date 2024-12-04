import { CONFIG } from "../emulatorSetup";
import { PriceData } from "../services/priceService";

// Test environment configuration
export const TEST_CONFIG = {
  apiUrl: `http://localhost:5001/${CONFIG.projectId}/us-central1/api`,
  firestoreEmulator: CONFIG.firestoreEmulator,
  projectId: CONFIG.projectId,
  maxRetries: 5,
  retryDelay: 1000,
  defaultTimeout: 180000,
};

// Export API URL for tests
export const API_URL = TEST_CONFIG.apiUrl;

// Mock price data for testing
export const MOCK_PRICE_DATA: Record<string, PriceData> = {
  solana: {
    usd: 100.0,
    usd_24h_change: 5.0,
  },
  project89: {
    usd: 1.0,
    usd_24h_change: 2.0,
  },
};
