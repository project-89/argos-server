import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils/error";
import {
  OnboardingProgress,
  StartOnboardingRequest,
  VerifyMissionRequest,
  CompleteOnboardingRequest,
  SocialVerificationProofSchema,
} from "../schemas";
import { getFingerprintById } from "./fingerprint.service";
import { hashSocialIdentity } from "../utils/hash";
import { getDb, formatDocument } from "../utils/mongodb";

const LOG_PREFIX = "[Onboarding Service]";

// Constants for social verification
const REQUIRED_MENTION = "@index89";
const POST_AGE_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds

const findExistingAnonUser = async ({
  hashedUsername,
}: {
  hashedUsername: string;
}): Promise<{ id: string; data: any } | null> => {
  try {
    const db = await getDb();
    const existingUser = await db
      .collection(COLLECTIONS.ANON_USERS)
      .findOne({ "identity.hashedUsername": hashedUsername });

    if (!existingUser) {
      return null;
    }

    return { id: existingUser.id, data: existingUser };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error finding existing anon user:`, error);
    throw error;
  }
};

export const startOnboarding = async (
  request: StartOnboardingRequest,
): Promise<OnboardingProgress> => {
  try {
    const db = await getDb();
    const { fingerprintId } = request.body;

    // Verify fingerprint exists
    const fingerprint = await getFingerprintById(fingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const now = new Date();

    // Create initial onboarding progress
    const onboarding: Omit<OnboardingProgress, "id"> = {
      fingerprintId,
      stage: "initial",
      missions: [
        {
          id: "social_creation",
          type: "social_creation",
          status: "pending",
          attempts: 0,
        },
        {
          id: "wallet_creation",
          type: "wallet_creation",
          status: "pending",
          attempts: 0,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const onboardingWithId = {
      id: crypto.randomUUID(),
      ...onboarding,
    };

    await db.collection(COLLECTIONS.ONBOARDING).insertOne(onboardingWithId);
    return onboardingWithId as OnboardingProgress;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error starting onboarding:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_START_ONBOARDING);
  }
};

export const verifyMission = async (request: VerifyMissionRequest): Promise<OnboardingProgress> => {
  try {
    const db = await getDb();
    const { onboardingId } = request.params;
    const { missionId, proof } = request.body;

    const onboardingDoc = await db.collection(COLLECTIONS.ONBOARDING).findOne({ id: onboardingId });
    if (!onboardingDoc) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    const onboarding = onboardingDoc as OnboardingProgress;

    if (onboarding.stage === "hivemind_connected") {
      throw new ApiError(400, ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
    }

    const mission = onboarding.missions.find((m) => m.id === missionId);
    if (!mission) {
      throw new ApiError(404, ERROR_MESSAGES.MISSION_NOT_FOUND);
    }

    if (mission.status === "completed") {
      throw new ApiError(400, ERROR_MESSAGES.MISSION_ALREADY_COMPLETED);
    }

    // Verify mission completion based on type
    if (mission.type === "social_creation") {
      // Verify social proof
      if (proof.type !== "social") {
        throw new ApiError(400, "Social verification is required for social creation");
      }

      const socialProof = await SocialVerificationProofSchema.parseAsync(proof);

      // Verify mention
      if (!socialProof.content.includes(REQUIRED_MENTION)) {
        throw new ApiError(400, `Post must include a mention of ${REQUIRED_MENTION}`);
      }

      // Verify post age
      const postAge = Date.now() - socialProof.createdAt;
      if (postAge > POST_AGE_LIMIT) {
        throw new ApiError(400, "Post is too old. Must be created within the last 5 minutes.");
      }

      const now = new Date();
      const { hashedUsername, usernameSalt } = hashSocialIdentity(
        socialProof.platform,
        socialProof.username,
      );

      // Check if this social identity already exists
      const existingAnonUser = await findExistingAnonUser({ hashedUsername });
      let anonSocialUserId: string;

      const verificationProof = {
        platform: socialProof.platform,
        postUrl: socialProof.postUrl,
        createdAt: socialProof.createdAt,
      };

      const discoveryHistory = {
        action: "onboarding_verification" as const,
        createdAt: now,
      };

      if (existingAnonUser) {
        // Update existing user
        anonSocialUserId = existingAnonUser.id;
        await db.collection(COLLECTIONS.ANON_USERS).updateOne(
          { id: anonSocialUserId },
          {
            $set: {
              "identity.lastSeen": now,
              "identity.verifiedAt": now,
              "identity.verificationMethod": "social_proof",
              status: "verified",
              linkedFingerprintId: onboarding.fingerprintId,
              "metadata.hivemindVerification": {
                verifiedAt: now,
                proof: verificationProof,
              },
            },
            $push: {
              discoveryHistory: discoveryHistory,
            },
          },
        );
      } else {
        // Create new user
        const anonUser = {
          id: crypto.randomUUID(),
          identity: {
            platform: socialProof.platform,
            hashedUsername,
            usernameSalt,
            lastSeen: now,
            verifiedAt: now,
            verificationMethod: "social_proof",
          },
          status: "verified",
          tags: [],
          linkedFingerprintId: onboarding.fingerprintId,
          createdAt: now,
          updatedAt: now,
          discoverySource: "hivemind_onboarding",
          discoveryHistory: [discoveryHistory],
          metadata: {
            hivemindVerification: {
              verifiedAt: now,
              proof: verificationProof,
            },
          },
        };

        await db.collection(COLLECTIONS.ANON_USERS).insertOne(anonUser);
        anonSocialUserId = anonUser.id;
      }

      // Store verification info in onboarding metadata
      onboarding.metadata = {
        ...onboarding.metadata,
        verifiedSocialIdentity: {
          platform: socialProof.platform,
          hashedUsername,
          usernameSalt,
          anonSocialUserId,
          previouslyExisted: !!existingAnonUser,
          verifiedAt: now,
        },
      };

      // Update mission status
      mission.status = "completed";
      mission.completedAt = now;
      mission.proof = proof;
      mission.verificationMetadata = {
        platform: socialProof.platform,
        verificationMethod: "social_proof",
        verifiedAt: now,
      };
      onboarding.stage = "social_created";
    } else if (mission.type === "wallet_creation") {
      // Verify wallet creation
      if (onboarding.stage !== "social_created") {
        throw new ApiError(400, ERROR_MESSAGES.INVALID_MISSION_ORDER);
      }

      if (proof.type !== "wallet") {
        throw new ApiError(400, "Wallet verification is required for wallet creation");
      }

      // TODO: Implement wallet signature verification
      const now = new Date();
      mission.status = "completed";
      mission.completedAt = now;
      mission.proof = proof;
      mission.verificationMetadata = {
        platform: "wallet",
        verificationMethod: "signature",
        verifiedAt: now,
      };
      onboarding.stage = "wallet_created";
    }

    onboarding.updatedAt = new Date();

    // Find and update the mission in the missions array
    const missionIndex = onboarding.missions.findIndex((m) => m.id === missionId);
    if (missionIndex !== -1) {
      onboarding.missions[missionIndex] = mission;
    }

    // Update the onboarding document
    await db.collection(COLLECTIONS.ONBOARDING).updateOne(
      { id: onboardingId },
      {
        $set: {
          missions: onboarding.missions,
          stage: onboarding.stage,
          updatedAt: onboarding.updatedAt,
          metadata: onboarding.metadata,
        },
      },
    );

    return onboarding;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error verifying mission:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VERIFY_MISSION);
  }
};

export const getOnboardingProgress = async (onboardingId: string): Promise<OnboardingProgress> => {
  try {
    const db = await getDb();
    const onboarding = await db.collection(COLLECTIONS.ONBOARDING).findOne({ id: onboardingId });

    if (!onboarding) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    return formatDocument(onboarding) as OnboardingProgress;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting onboarding progress:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ONBOARDING);
  }
};

export const completeOnboarding = async (
  request: CompleteOnboardingRequest,
): Promise<OnboardingProgress> => {
  try {
    const db = await getDb();
    const { onboardingId } = request.params;
    const { walletAddress, signature, message, timestamp } = request.body;

    // Get the onboarding progress
    const onboarding = await getOnboardingProgress(onboardingId);

    if (onboarding.stage === "hivemind_connected") {
      throw new ApiError(400, ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
    }

    if (onboarding.stage !== "wallet_created") {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_MISSION_ORDER);
    }

    // TODO: Verify wallet signature
    // TODO: Create account with social and wallet details

    const now = new Date();

    // Update onboarding with completion
    onboarding.stage = "hivemind_connected";
    onboarding.updatedAt = now;
    onboarding.metadata = {
      ...onboarding.metadata,
      verifiedWallet: {
        address: walletAddress,
        verifiedAt: now,
        signatureProof: signature,
      },
    };

    // Update the database
    await db.collection(COLLECTIONS.ONBOARDING).updateOne(
      { id: onboardingId },
      {
        $set: {
          stage: onboarding.stage,
          updatedAt: onboarding.updatedAt,
          metadata: onboarding.metadata,
        },
      },
    );

    return onboarding;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error completing onboarding:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_COMPLETE_ONBOARDING);
  }
};
