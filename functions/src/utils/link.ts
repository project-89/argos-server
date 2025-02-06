/**
 * Generate a game link with encoded parameters
 */
export const generateGameLink = ({
  transitoryId,
  username,
  platform = "x",
}: {
  transitoryId: string;
  username: string;
  platform: "x";
}): string => {
  const payload = Buffer.from(
    JSON.stringify({
      tid: transitoryId,
      u: username,
      p: platform,
      t: Date.now(),
    }),
  ).toString("base64");

  return `https://oneirocom.ai/reality-game?ref=${payload}`;
};
