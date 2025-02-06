import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

/**
 * Verifies a signature from a Solana wallet
 * @param signature - The signature in base58 format
 * @param walletAddress - The Solana wallet address that signed the message
 * @param message - The original message that was signed
 * @returns boolean indicating if the signature is valid
 */
export const verifySignature = async (
  signature: string,
  walletAddress: string,
  message: string,
): Promise<boolean> => {
  try {
    // Convert wallet address to PublicKey
    const publicKey = new PublicKey(walletAddress);

    // Decode the base58 signature
    const signatureBytes = bs58.decode(signature);

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
};
