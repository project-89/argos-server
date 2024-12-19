import { Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, ROLES } from "../constants";
import { Fingerprint } from "../types/models";

const SUSPICIOUS_IP_THRESHOLD = 10; // Number of requests needed from an IP to establish it as trusted
const SUSPICIOUS_TIME_WINDOW =
  process.env.FUNCTIONS_EMULATOR === "true"
    ? 100 // 100ms for testing
    : 24 * 60 * 60 * 1000; // 24 hours in milliseconds for production

interface FingerprintDocData extends Omit<Fingerprint, "createdAt" | "ipMetadata"> {
  id: string;
  createdAt: Timestamp;
  ipMetadata: {
    primaryIp?: string;
    ipFrequency: Record<string, number>;
    lastSeenAt: Record<string, Timestamp>;
    suspiciousIps: string[];
  };
}

interface FingerprintWithSuspicious extends FingerprintDocData {
  isSuspicious?: boolean;
}

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fingerprint, metadata } = req.body;
    const ip = getClientIp(req);

    // Validate required fields
    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: fingerprint",
      });
    }

    // Create initial document data
    const now = Timestamp.now();
    const docData: Omit<FingerprintDocData, "id"> = {
      fingerprint,
      roles: [ROLES.USER], // Default role
      createdAt: now,
      metadata: metadata || {},
      tags: {},
      ipAddresses: [ip],
      ipMetadata: {
        primaryIp: ip,
        ipFrequency: { [ip]: 1 },
        lastSeenAt: { [ip]: now },
        suspiciousIps: [],
      },
    };

    // Create fingerprint document
    const db = getFirestore();
    const fingerprintRef = await db.collection(COLLECTIONS.FINGERPRINTS).add(docData);

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        id: fingerprintRef.id,
        ...docData,
      },
    });
  } catch (error) {
    console.error("Error registering fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const fingerprintId = req.fingerprintId;
    const ip = getClientIp(req);

    // Verify ownership
    if (id !== fingerprintId) {
      return res.status(403).json({
        success: false,
        error: "API key does not match fingerprint",
      });
    }

    // Get fingerprint document
    const db = getFirestore();
    const fingerprintRef = db.collection(COLLECTIONS.FINGERPRINTS).doc(id);

    // Use transaction to ensure atomic updates of IP metadata
    try {
      const updatedDoc = await db.runTransaction(async (transaction) => {
        const fingerprintDoc = await transaction.get(fingerprintRef);

        if (!fingerprintDoc.exists) {
          throw new Error("Fingerprint not found");
        }

        const data = fingerprintDoc.data() as FingerprintDocData;
        const ipAddresses = data.ipAddresses || [];
        const ipMetadata = data.ipMetadata || {
          ipFrequency: {},
          lastSeenAt: {},
          suspiciousIps: [],
        };

        // Update IP frequency and last seen
        const newFrequency = (ipMetadata.ipFrequency[ip] || 0) + 1;
        ipMetadata.ipFrequency[ip] = newFrequency;
        ipMetadata.lastSeenAt[ip] = Timestamp.now();

        // Determine primary IP (most frequent)
        const [primaryIp, primaryFrequency] = Object.entries(ipMetadata.ipFrequency).reduce(
          (a, b) => (a[1] > b[1] ? a : b),
        );
        ipMetadata.primaryIp = primaryIp;

        // Check for suspicious activity
        let isSuspicious = false;
        if (!ipAddresses.includes(ip)) {
          // New IP address detected
          ipAddresses.push(ip);

          // Check if this IP is suspicious
          const isPrimaryEstablished = primaryFrequency >= SUSPICIOUS_IP_THRESHOLD;
          const timeSinceCreation = Date.now() - data.createdAt.toMillis();
          const isWithinInitialWindow = timeSinceCreation <= SUSPICIOUS_TIME_WINDOW;

          console.log(`[Fingerprint ${id}] New IP detected:`, {
            ip,
            primaryIp,
            primaryFrequency,
            isPrimaryEstablished,
            isWithinInitialWindow,
            createdAt: data.createdAt.toMillis(),
            now: Date.now(),
            timeDiff: timeSinceCreation,
            timeWindow: SUSPICIOUS_TIME_WINDOW,
            environment: {
              isEmulator: process.env.FUNCTIONS_EMULATOR === "true",
            },
          });

          if (isPrimaryEstablished && !isWithinInitialWindow) {
            isSuspicious = true;
            if (!ipMetadata.suspiciousIps.includes(ip)) {
              ipMetadata.suspiciousIps.push(ip);
              console.warn(
                `[Fingerprint ${id}] Suspicious IP detected: ${ip} (primary: ${primaryIp}, freq: ${primaryFrequency}, timeSince: ${timeSinceCreation}ms)`,
              );
            }
          }
        }

        // Update the document
        transaction.update(fingerprintRef, {
          ipAddresses,
          ipMetadata,
        });

        const updatedData: FingerprintWithSuspicious = {
          ...data,
          id: fingerprintDoc.id,
          ipAddresses,
          ipMetadata,
          isSuspicious,
        };

        return updatedData;
      });

      // Return success response with suspicious flag if needed
      const { isSuspicious, ...responseData } = updatedDoc;
      const response: {
        success: boolean;
        data: FingerprintDocData;
        warning?: string;
      } = {
        success: true,
        data: responseData,
      };

      if (isSuspicious) {
        response.warning = "Suspicious IP activity detected";
      }

      return res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Fingerprint not found") {
        return res.status(404).json({
          success: false,
          error: "Fingerprint not found",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error getting fingerprint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
