import { IpMetadata } from "../schemas";

/**
 * Creates initial IP metadata for a new record
 */
export const createInitialIpMetadata = ({
  ip,
  timestamp,
}: {
  ip: string;
  timestamp: number;
}): IpMetadata => ({
  primaryIp: ip,
  ipFrequency: { [ip]: 1 },
  lastSeenAt: { [ip]: timestamp },
  suspiciousIps: [],
});

/**
 * Updates IP frequency and last seen timestamp
 */
export const updateIpFrequency = ({
  ipMetadata,
  ip,
}: {
  ipMetadata: IpMetadata;
  ip: string;
}): { frequency: number; lastSeen: number } => {
  const newFrequency = (ipMetadata.ipFrequency[ip] || 0) + 1;
  const lastSeen = Date.now();
  return { frequency: newFrequency, lastSeen };
};

/**
 * Determines the primary IP based on frequency
 */
export const determinePrimaryIp = ({
  ipFrequency,
  currentIp,
}: {
  ipFrequency: Record<string, number>;
  currentIp: string;
}): string => {
  const [primaryIp] = Object.entries(ipFrequency).reduce(
    (a, b) => (a[1] > b[1] ? a : b),
    [currentIp, 0],
  );
  return primaryIp;
};

/**
 * Updates IP metadata for a record
 */
export const updateIpMetadata = ({
  currentIpAddresses = [],
  currentIpMetadata = null,
  ip,
}: {
  currentIpAddresses: string[];
  currentIpMetadata: IpMetadata | null;
  ip: string;
}): {
  ipAddresses: string[];
  ipMetadata: IpMetadata;
} => {
  const ipAddresses = [...currentIpAddresses];
  const ipMetadata = {
    ...(currentIpMetadata || {
      ipFrequency: {},
      lastSeenAt: {},
      primaryIp: undefined,
      suspiciousIps: [],
    }),
  };

  // Update frequency and last seen
  const { frequency, lastSeen } = updateIpFrequency({ ipMetadata, ip });
  ipMetadata.ipFrequency[ip] = frequency;
  ipMetadata.lastSeenAt[ip] = lastSeen;

  // Update primary IP
  ipMetadata.primaryIp = determinePrimaryIp({
    ipFrequency: ipMetadata.ipFrequency,
    currentIp: ip,
  });

  // Add new IP if not already present
  if (!ipAddresses.includes(ip)) {
    ipAddresses.push(ip);
  }

  return { ipAddresses, ipMetadata };
};

/**
 * Updates document with new IP data in a MongoDB transaction
 */
export const updateIpDataInTransaction = ({
  session,
  collection,
  docId,
  ipAddresses,
  ipMetadata,
}: {
  session: any;
  collection: any;
  docId: string;
  ipAddresses: string[];
  ipMetadata: IpMetadata;
}): void => {
  collection.updateOne({ _id: docId }, { $set: { ipAddresses, ipMetadata } }, { session });
};
