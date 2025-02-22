import { AccountRole } from "../constants";

/**
 * Represents the authentication state of a request
 */
interface AuthContext {
  // Basic tracking (always present after fingerprintVerify middleware)
  fingerprint: {
    id: string;
    roles: AccountRole[]; // Set by role middleware for permission checks
  };

  // Web3 authentication (present after wallet connection)
  wallet?: {
    address: string;
  };

  // Account context (present after full authentication)
  account?: {
    id: string;
  };

  // Agent authentication (present in agent routes)
  agent?: {
    id: string;
    isActive: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Authentication Context
       * Built up through middleware chain:
       * 1. fingerprintVerify -> sets auth.fingerprintId
       * 2. authMiddleware -> sets auth.wallet and/or auth.account
       * 3. roleMiddleware -> sets auth.account.roles
       * 4. agentMiddleware -> sets auth.agent
       */
      auth?: AuthContext;

      // Express defaults - consider making these generic
      body: any;
      query: any;
      params: any;
    }
  }
}

export {};
