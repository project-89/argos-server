import { Request, Response, NextFunction } from "express";
import { verifyProfileAccess } from "../../../hivemind/middleware/profileOwnership.middleware";
import { profileService } from "../../../hivemind/services/profile.service";
import { Profile } from "../../../hivemind/types/profile.types";
import { ERROR_MESSAGES } from "../../../constants/api";

// Extend Request to include fingerprintId
declare global {
  namespace Express {
    interface Request {
      fingerprintId?: string;
    }
  }
}

// Mock profileService
jest.mock("../../../hivemind/services/profile.service");

describe("Profile Ownership Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  it("should allow OPTIONS requests without checking profile", async () => {
    mockReq = {
      method: "OPTIONS",
      fingerprintId: "test-fingerprint",
      params: { profileId: "test-profile" },
    };

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(profileService.getProfile).not.toHaveBeenCalled();
  });

  it("should allow requests without profileId (for creation endpoints)", async () => {
    mockReq = {
      method: "POST",
      fingerprintId: "test-fingerprint",
      params: {},
    };

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(profileService.getProfile).not.toHaveBeenCalled();
  });

  it("should allow access when profile belongs to caller", async () => {
    const testProfile: Profile = {
      id: "test-profile",
      fingerprintId: "test-fingerprint",
      walletAddress: "0x123",
      username: "test-user",
      bio: "test bio",
      preferences: { isProfilePublic: true, showStats: true },
      createdAt: 123456789,
      updatedAt: 123456789,
      avatarUrl: "",
      contactInfo: {},
    };

    mockReq = {
      method: "GET",
      fingerprintId: "test-fingerprint",
      params: { profileId: "test-profile" },
    };

    (profileService.getProfile as jest.Mock).mockResolvedValueOnce(testProfile);

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(profileService.getProfile).toHaveBeenCalledWith("test-profile");
    expect(mockReq.profile).toBe(testProfile);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should deny access when profile does not belong to caller", async () => {
    const testProfile: Profile = {
      id: "test-profile",
      fingerprintId: "different-fingerprint",
      walletAddress: "0x123",
      username: "test-user",
      bio: "test bio",
      preferences: { isProfilePublic: true, showStats: true },
      createdAt: 123456789,
      updatedAt: 123456789,
      avatarUrl: "",
      contactInfo: {},
    };

    mockReq = {
      method: "GET",
      fingerprintId: "test-fingerprint",
      params: { profileId: "test-profile" },
    };

    (profileService.getProfile as jest.Mock).mockResolvedValueOnce(testProfile);

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(profileService.getProfile).toHaveBeenCalledWith("test-profile");
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
        success: false,
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle profile not found error", async () => {
    mockReq = {
      method: "GET",
      fingerprintId: "test-fingerprint",
      params: { profileId: "non-existent-profile" },
    };

    (profileService.getProfile as jest.Mock).mockRejectedValueOnce(new Error("Profile not found"));

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(profileService.getProfile).toHaveBeenCalledWith("non-existent-profile");
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: ERROR_MESSAGES.INTERNAL_ERROR,
        success: false,
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should work with id param instead of profileId", async () => {
    const testProfile: Profile = {
      id: "test-profile",
      fingerprintId: "test-fingerprint",
      walletAddress: "0x123",
      username: "test-user",
      bio: "test bio",
      preferences: { isProfilePublic: true, showStats: true },
      createdAt: 123456789,
      updatedAt: 123456789,
      avatarUrl: "",
      contactInfo: {},
    };

    mockReq = {
      method: "GET",
      fingerprintId: "test-fingerprint",
      params: { id: "test-profile" }, // Using id instead of profileId
    };

    (profileService.getProfile as jest.Mock).mockResolvedValueOnce(testProfile);

    await verifyProfileAccess(mockReq as Request, mockRes as Response, mockNext);

    expect(profileService.getProfile).toHaveBeenCalledWith("test-profile");
    expect(mockReq.profile).toBe(testProfile);
    expect(mockNext).toHaveBeenCalled();
  });
});
