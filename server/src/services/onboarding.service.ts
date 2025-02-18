import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { ApiError } from "../utils/error";
import {
  OnboardingProgress,
  StartOnboardingRequest,
  VerifyMissionRequest,
  CompleteOnboardingRequest,
  OnboardingMission,
  OnboardingStage,
  SocialVerificationProofSchema,
  VerificationProofSchema,
} from "../schemas";
import { getFingerprintById } from "./fingerprint.service";
import { hashSocialIdentity, generateAnonDisplayName } from "../utils/hash";

// Constants for social verification
const REQUIRED_MENTION = "@index89";
const POST_AGE_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
const MIN_ACCOUNT_AGE_DAYS = 30; // Minimum account age requirement

const findExistingAnonUser = async ({
  db,
  hashedUsername,
}: {
  db: FirebaseFirestore.Firestore;
  hashedUsername: string;
}): Promise<{ id: string; data: any } | null> => {
  const existingUserQuery = await db
    .collection(COLLECTIONS.ANON_USERS)
    .where("identity.hashedUsername", "==", hashedUsername)
    .limit(1)
    .get();

  if (existingUserQuery.empty) {
    return null;
  }

  const doc = existingUserQuery.docs[0];
  return { id: doc.id, data: doc.data() };
};

export const startOnboarding = async (
  request: StartOnboardingRequest,
): Promise<OnboardingProgress> => {
  try {
    const db = getFirestore();
    const onboardingRef = db.collection(COLLECTIONS.ONBOARDING);
    const { fingerprintId, platform } = request.body;

    // Verify fingerprint exists
    const fingerprint = await getFingerprintById(fingerprintId);
    if (!fingerprint) {
      throw new ApiError(404, ERROR_MESSAGES.FINGERPRINT_NOT_FOUND);
    }

    const now = Timestamp.now();

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

    const docRef = await onboardingRef.add(onboarding);
    return { id: docRef.id, ...onboarding };
  } catch (error) {
    console.error("[Start Onboarding] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_START_ONBOARDING);
  }
};

export const verifyMission = async (request: VerifyMissionRequest): Promise<OnboardingProgress> => {
  try {
    const db = getFirestore();
    const { onboardingId } = request.params;
    const { missionId, proof, metadata } = request.body;
    const onboardingRef = db.collection(COLLECTIONS.ONBOARDING).doc(onboardingId);

    const doc = await onboardingRef.get();
    if (!doc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    const onboarding = { id: doc.id, ...doc.data() } as OnboardingProgress;

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

      const now = Timestamp.now();
      const { hashedUsername, usernameSalt } = hashSocialIdentity(
        socialProof.platform,
        socialProof.username,
      );

      // Check if this social identity already exists
      const existingAnonUser = await findExistingAnonUser({ db, hashedUsername });
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
        await db
          .collection(COLLECTIONS.ANON_USERS)
          .doc(anonSocialUserId)
          .update({
            "identity.lastSeen": now,
            "identity.verifiedAt": now,
            "identity.verificationMethod": "social_proof",
            status: "verified",
            linkedFingerprintId: onboarding.fingerprintId,
            discoveryHistory: FieldValue.arrayUnion(discoveryHistory),
            metadata: {
              ...existingAnonUser.data.metadata,
              hivemindVerification: {
                verifiedAt: now,
                proof: verificationProof,
              },
            },
          });
      } else {
        // Create new user
        const anonUserRef = await db.collection(COLLECTIONS.ANON_USERS).add({
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
        });
        anonSocialUserId = anonUserRef.id;
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
      const now = Timestamp.now();
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

    onboarding.updatedAt = Timestamp.now();
    await onboardingRef.update(onboarding);

    return onboarding;
  } catch (error) {
    console.error("[Verify Mission] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_VERIFY_MISSION);
  }
};

export const getOnboardingProgress = async (onboardingId: string): Promise<OnboardingProgress> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.ONBOARDING).doc(onboardingId).get();

    if (!doc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    return { id: doc.id, ...doc.data() } as OnboardingProgress;
  } catch (error) {
    console.error("[Get Onboarding Progress] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_GET_ONBOARDING);
  }
};

export const completeOnboarding = async (
  request: CompleteOnboardingRequest,
): Promise<OnboardingProgress> => {
  try {
    const db = getFirestore();
    const { onboardingId } = request.params;
    const { walletAddress, signature, message, timestamp } = request.body;
    const onboardingRef = db.collection(COLLECTIONS.ONBOARDING).doc(onboardingId);

    const doc = await onboardingRef.get();
    if (!doc.exists) {
      throw new ApiError(404, ERROR_MESSAGES.ONBOARDING_NOT_FOUND);
    }

    const onboarding = { id: doc.id, ...doc.data() } as OnboardingProgress;

    if (onboarding.stage === "hivemind_connected") {
      throw new ApiError(400, ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
    }

    if (onboarding.stage !== "wallet_created") {
      throw new ApiError(400, ERROR_MESSAGES.INVALID_MISSION_ORDER);
    }

    // Verify wallet signature
    // TODO: Implement signature verification

    // Create the account with the verified social identity
    const now = Timestamp.now();
    const accountRef = await db.collection(COLLECTIONS.ACCOUNTS).add({
      walletAddress,
      fingerprintId: onboarding.fingerprintId,
      createdAt: now,
      lastLogin: now,
      status: "active",
      metadata: {},
      verifiedSocialIdentities: onboarding.metadata?.verifiedSocialIdentity
        ? [onboarding.metadata.verifiedSocialIdentity]
        : [],
    });

    // Update onboarding with account ID
    onboarding.accountId = accountRef.id;
    onboarding.stage = "hivemind_connected";
    onboarding.updatedAt = now;
    await onboardingRef.update(onboarding);

    return onboarding;
  } catch (error) {
    console.error("[Complete Onboarding] Error:", error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.FAILED_TO_COMPLETE_ONBOARDING);
  }
};
