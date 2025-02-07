import { Router } from "express";
import { sendSuccess } from "../utils";
import { publicEndpoint } from "../middleware";
import accountRoutes from "./account.routes";
import fingerprintRoutes from "./fingerprint.routes";
import visitRoutes from "./visit.routes";
import tagRoutes from "./tag.routes";
import roleRoutes from "./role.routes";
import priceRoutes from "./price.routes";
import presenceRoutes from "./presence.routes";
import impressionRoutes from "./impression.routes";
import capabilityRoutes from "./capability.routes";
import profileRoutes from "./profile.routes";
import statsRoutes from "./stats.routes";

const router = Router();

// Health check endpoint
router.get("/health", ...publicEndpoint(), (_, res) => {
  sendSuccess(res, {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Mount domain-specific routers
router.use(accountRoutes); // /accounts/*
router.use(fingerprintRoutes); // /fingerprints/*
router.use(visitRoutes); // /visits/*
router.use(tagRoutes); // /tags/*
router.use(roleRoutes); // /roles/*
router.use(priceRoutes); // /prices/*
router.use(presenceRoutes); // /presence/*
router.use(impressionRoutes); // /impressions/*
router.use(capabilityRoutes); // /capabilities/*
router.use(profileRoutes); // /profiles/*
router.use(statsRoutes); // /stats/*

export default router;
