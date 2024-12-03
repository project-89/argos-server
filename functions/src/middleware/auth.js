const { validateApiKey } = require("../services/apiKeyService");

exports.validateApiKey = async (req, res, next) => {
  // List of public endpoints that don't require API key
  const publicEndpoints = [
    "/reality-stability",
    "/register-fingerprint",
    "/get-fingerprint",
    "/log-visit",
    "/update-presence",
    "/remove-site",
  ];

  // Skip API key check for public endpoints or if in development
  if (publicEndpoints.includes(req.path) || process.env.FUNCTIONS_EMULATOR) {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "API key is required" });
  }

  const endpoint = req.path.substring(1);
  const validation = await validateApiKey(apiKey, endpoint);

  if (!validation.isValid) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  req.fingerprintId = validation.fingerprintId;
  next();
};
