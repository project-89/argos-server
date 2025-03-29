import { initializeMCPTemplates } from "./services/mcp.init.service";

/**
 * Initialize the Master Control Program (MCP) system
 */
export async function initializeMCPSystem(): Promise<void> {
  console.log("[MCP System] Initializing MCP system");

  try {
    // Initialize MCP templates
    await initializeMCPTemplates();

    console.log("[MCP System] MCP system initialization complete");
  } catch (error) {
    console.error("[MCP System] Error initializing MCP system:", error);
  }
}

/**
 * Module to programmatically control and automate operations
 * This is the main interface for the Master Control Program (MCP)
 */
export const MCPSystem = {
  initialize: initializeMCPSystem,
};

export default MCPSystem;
