import { getCurrentUnixMillis } from "../../utils/timestamp";
import { ROLE } from "../../constants/roles.constants";
import { Fingerprint } from "../../types/models/models.types";
import { Timestamp } from "firebase-admin/firestore";
import { PriceResponse } from "@/types/services";

export const MOCK_PRICE_DATA: PriceResponse = {
  project89: {
    usd: 0.15,
    usd_24h_change: 2.5,
  },
};

export const DEFAULT_TOKENS = ["Project89"];

export const MOCK_PRICE_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  timestamp: getCurrentUnixMillis() - i * 24 * 60 * 60 * 1000,
  price: 0.15 + Math.sin(i) * 0.01, // Fluctuate around $0.15
}));

export const testFingerprints: Record<string, Fingerprint> = {
  admin: {
    id: "admin-fingerprint",
    roles: [ROLE.ADMIN, ROLE.USER],
    tags: ["admin-tag"],
    createdAt: Timestamp.now(),
    lastVisited: Timestamp.now(),
    fingerprint: "admin-fingerprint",
    ipAddresses: [],
    ipMetadata: {
      ipFrequency: {},
      lastSeenAt: {},
      suspiciousIps: [],
    },
    metadata: {},
  },
  seniorAgent: {
    id: "senior-agent-fingerprint",
    roles: [ROLE.AGENT_SENIOR, ROLE.USER],
    tags: ["senior-tag"],
    createdAt: Timestamp.now(),
    lastVisited: Timestamp.now(),
    fingerprint: "senior-agent-fingerprint",
    ipAddresses: [],
    ipMetadata: {
      ipFrequency: {},
      lastSeenAt: {},
      suspiciousIps: [],
    },
    metadata: {},
  },
  fieldAgent: {
    id: "field-agent-fingerprint",
    roles: [ROLE.AGENT_FIELD, ROLE.USER],
    tags: ["field-tag"],
    createdAt: Timestamp.now(),
    lastVisited: Timestamp.now(),
    fingerprint: "field-agent-fingerprint",
    ipAddresses: [],
    ipMetadata: {
      ipFrequency: {},
      lastSeenAt: {},
      suspiciousIps: [],
    },
    metadata: {},
  },
};

export const tagRules = [
  {
    id: "rule1",
    tag: "senior-tag",
    role: ROLE.AGENT_SENIOR,
    createdAt: Timestamp.now(),
  },
  {
    id: "rule2",
    tag: "field-tag",
    role: ROLE.AGENT_FIELD,
    createdAt: Timestamp.now(),
  },
];
