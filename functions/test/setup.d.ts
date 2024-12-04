import "../src/register";
import * as admin from "firebase-admin";
import { PriceData } from "../src/services/priceService";
export declare const TEST_CONFIG: {
    apiUrl: string;
    firestoreEmulator: string;
    projectId: string;
    maxRetries: number;
    retryDelay: number;
    defaultTimeout: number;
};
export declare const API_URL: string;
export declare const MOCK_PRICE_DATA: Record<string, PriceData>;
export declare const initializeTestEnvironment: () => Promise<admin.firestore.Firestore>;
export declare const createTestData: () => Promise<{
    fingerprintId: string;
    apiKey: string;
}>;
