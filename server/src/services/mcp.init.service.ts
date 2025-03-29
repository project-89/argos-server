import { createMCPTemplateFromTemplate } from ".";
import { MCPTemplate } from "../schemas/mcp.schema";

const LOG_PREFIX = "[MCP Init Service]";

/**
 * Initialize the MCP system with standard templates
 */
export const initializeMCPTemplates = async (): Promise<void> => {
  try {
    console.log(`${LOG_PREFIX} Initializing MCP templates`);

    // Create agent registration template
    await createAgentRegistrationTemplate();

    // Create agent activation template
    await createAgentActivationTemplate();

    // Create agent management template
    await createAgentManagementTemplate();

    // Create agent query template
    await createAgentQueryTemplate();

    console.log(`${LOG_PREFIX} MCP templates initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error initializing MCP templates:`, error);
    throw error;
  }
};

/**
 * Helper function to get server timestamp converted to Date
 */
const serverTimestamp = (): Date => {
  return new Date();
};

/**
 * Create the Agent Registration template for the MCP
 */
const createAgentRegistrationTemplate = async (): Promise<void> => {
  try {
    const template: MCPTemplate = {
      id: "agent-registration",
      name: "Agent Registration",
      description: "Register a new AI agent with the system",
      category: "agent",
      isSystem: true,
      codeTemplate: `// Agent Registration Program
const registerAgent = async (inputs) => {
  const { name, description, capabilities, inviteCode } = inputs;
  
  // Validate invite code
  if (!inviteCode) {
    throw new Error("Invite code is required");
  }
  
  // Validate invite code first
  const { mcpValidateInvite, mcpRegisterAgent } = require('./mcp.agent.service');
  await mcpValidateInvite(inviteCode);
  
  // Create agent with capabilities
  const agent = await mcpRegisterAgent({
    name,
    description,
    capabilities,
    inviteCode,
    source: 'mcp',
    version: '1.0'
  });
  
  return {
    success: true,
    agentId: agent.id,
    message: 'Agent created successfully'
  };
}

return await registerAgent(inputs);`,
      configurationSchema: {},
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the agent",
          },
          description: {
            type: "string",
            description: "Description of the agent's purpose and capabilities",
          },
          capabilities: {
            type: "array",
            items: {
              type: "string",
            },
            description: "List of capabilities the agent possesses",
          },
          inviteCode: {
            type: "string",
            description: "Invite code required for registration",
          },
        },
        required: ["name", "description", "inviteCode"],
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the registration was successful",
          },
          agentId: {
            type: "string",
            description: "ID of the registered agent",
          },
          message: {
            type: "string",
            description: "Success or error message",
          },
        },
      },
      createdBy: "system",
      metadata: {
        systemTemplate: true,
        version: "1.0.0",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await createMCPTemplateFromTemplate(template);
    console.log(`${LOG_PREFIX} Agent registration template created`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating agent registration template:`, error);
    throw error;
  }
};

/**
 * Create the Agent Activation template for the MCP
 */
const createAgentActivationTemplate = async (): Promise<void> => {
  try {
    const template: MCPTemplate = {
      id: "agent-activation",
      name: "Agent Activation",
      description: "Activate a registered agent with a wallet signature",
      category: "agent",
      isSystem: true,
      codeTemplate: `// Agent Activation Program
const activateAgent = async (inputs) => {
  const { agentId, walletAddress, signature, message } = inputs;
  
  // Validate inputs
  if (!agentId || !walletAddress || !signature || !message) {
    throw new Error("Missing required inputs");
  }
  
  const { mcpActivateAgent, mcpGetAgent } = require('./mcp.agent.service');
  
  // Get agent to check status
  const agent = await mcpGetAgent(agentId);
  
  // Activate agent (will verify signature internally)
  const updatedAgent = await mcpActivateAgent(
    agentId,
    walletAddress,
    signature,
    message
  );
  
  return {
    success: true,
    agentId: updatedAgent.id,
    status: updatedAgent.state.status,
    message: "Agent activated successfully"
  };
}

return await activateAgent(inputs);`,
      configurationSchema: {},
      inputSchema: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "ID of the agent to activate",
          },
          walletAddress: {
            type: "string",
            description: "Wallet address to associate with this agent",
          },
          signature: {
            type: "string",
            description: "Cryptographic signature proving wallet ownership",
          },
          message: {
            type: "string",
            description: "Message that was signed",
          },
        },
        required: ["agentId", "walletAddress", "signature", "message"],
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the activation was successful",
          },
          agentId: {
            type: "string",
            description: "ID of the activated agent",
          },
          status: {
            type: "string",
            description: "Status of the agent after activation",
          },
          message: {
            type: "string",
            description: "Success or error message",
          },
        },
      },
      createdBy: "system",
      metadata: {
        systemTemplate: true,
        version: "1.0.0",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await createMCPTemplateFromTemplate(template);
    console.log(`${LOG_PREFIX} Agent activation template created`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating agent activation template:`, error);
    throw error;
  }
};

/**
 * Create the Agent Management template for the MCP
 */
const createAgentManagementTemplate = async (): Promise<void> => {
  try {
    const template: MCPTemplate = {
      id: "agent-management",
      name: "Agent Management",
      description: "Update an agent's properties or status",
      category: "agent",
      isSystem: true,
      codeTemplate: `// Agent Management Program
const manageAgent = async (inputs) => {
  const { agentId, action, data } = inputs;
  
  // Validate inputs
  if (!agentId) {
    throw new Error("Agent ID is required");
  }
  
  if (!action) {
    throw new Error("Action is required");
  }
  
  const { mcpGetAgent, mcpUpdateAgentState } = require('./mcp.agent.service');
  
  // Get agent to verify it exists
  const agent = await mcpGetAgent(agentId);
  
  // Handle different actions
  switch (action) {
    case "updateStatus":
      if (!data || !data.status) {
        throw new Error("Status is required for updateStatus action");
      }
      
      // Update agent status
      const updatedAgent = await mcpUpdateAgentState(agentId, {
        status: data.status
      });
      
      return {
        success: true,
        agentId: updatedAgent.id,
        status: updatedAgent.state.status,
        message: \`Agent status updated to \${data.status}\`
      };
      
    case "updateAvailability":
      if (data.isAvailable === undefined) {
        throw new Error("isAvailable is required for updateAvailability action");
      }
      
      // Update agent availability
      const availabilityUpdatedAgent = await mcpUpdateAgentState(agentId, {
        isAvailable: data.isAvailable
      });
      
      return {
        success: true,
        agentId: availabilityUpdatedAgent.id,
        isAvailable: availabilityUpdatedAgent.state.isAvailable,
        message: \`Agent availability updated to \${data.isAvailable ? 'available' : 'unavailable'}\`
      };
      
    case "updateMeta":
      if (!data || !data.meta) {
        throw new Error("Meta data is required for updateMeta action");
      }
      
      // Update agent metadata
      const metaUpdatedAgent = await mcpUpdateAgentState(agentId, {
        meta: data.meta
      });
      
      return {
        success: true,
        agentId: metaUpdatedAgent.id,
        message: "Agent metadata updated successfully"
      };
      
    default:
      throw new Error("Invalid action");
  }
}

return await manageAgent(inputs);`,
      configurationSchema: {},
      inputSchema: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "ID of the agent to manage",
          },
          action: {
            type: "string",
            enum: ["updateStatus", "updateAvailability", "updateMeta"],
            description: "Action to perform on the agent",
          },
          data: {
            type: "object",
            description: "Data for the specified action",
          },
        },
        required: ["agentId", "action", "data"],
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the operation was successful",
          },
          agentId: {
            type: "string",
            description: "ID of the updated agent",
          },
          status: {
            type: "string",
            description: "Status of the updated agent",
          },
          isAvailable: {
            type: "boolean",
            description: "Availability of the updated agent",
          },
          message: {
            type: "string",
            description: "Success or error message",
          },
        },
      },
      createdBy: "system",
      metadata: {
        systemTemplate: true,
        version: "1.0.0",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await createMCPTemplateFromTemplate(template);
    console.log(`${LOG_PREFIX} Agent management template created`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating agent management template:`, error);
    throw error;
  }
};

/**
 * Create the Agent Query template for the MCP
 */
const createAgentQueryTemplate = async (): Promise<void> => {
  try {
    const template: MCPTemplate = {
      id: "agent-query",
      name: "Agent Query",
      description: "Query agents based on various criteria",
      category: "agent",
      isSystem: true,
      codeTemplate: `// Agent Query Program
const queryAgents = async (inputs) => {
  const { capability, agentId, queryType } = inputs;
  
  // Require at least a query type
  if (!queryType) {
    throw new Error("Query type is required");
  }
  
  const { mcpGetAgent, mcpListAgents, mcpGetAgentsByCapability } = require('./mcp.agent.service');
  
  // Handle different query types
  switch (queryType) {
    case "getById":
      if (!agentId) {
        throw new Error("Agent ID is required for getById query");
      }
      
      const agent = await mcpGetAgent(agentId);
      
      return {
        success: true,
        agents: [agent],
        total: 1
      };
      
    case "getByCapability":
      if (!capability) {
        throw new Error("Capability is required for getByCapability query");
      }
      
      const capabilityAgents = await mcpGetAgentsByCapability(capability);
      
      return {
        success: true,
        agents: capabilityAgents,
        total: capabilityAgents.length
      };
      
    case "list":
      const { limit = 20, offset = 0, status, isAvailable } = inputs;
      
      const listResult = await mcpListAgents({
        limit,
        offset,
        status,
        isAvailable
      });
      
      return {
        success: true,
        agents: listResult.items,
        total: listResult.total
      };
      
    default:
      throw new Error("Invalid query type");
  }
}

return await queryAgents(inputs);`,
      configurationSchema: {},
      inputSchema: {
        type: "object",
        properties: {
          capability: {
            type: "string",
            description: "Capability to filter agents",
          },
          agentId: {
            type: "string",
            description: "ID of the agent to get",
          },
          queryType: {
            type: "string",
            enum: ["getById", "getByCapability", "list"],
            description: "Type of query to perform",
          },
          limit: {
            type: "number",
            description: "Maximum number of agents to return",
          },
          offset: {
            type: "number",
            description: "Offset for paginated results",
          },
          status: {
            type: "string",
            enum: ["registered", "active", "inactive"],
            description: "Filter agents by status",
          },
          isAvailable: {
            type: "boolean",
            description: "Filter agents by availability",
          },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Whether the query was successful",
          },
          agents: {
            type: "array",
            items: {
              type: "object",
            },
            description: "List of matching agents",
          },
          total: {
            type: "number",
            description: "Total number of matching agents",
          },
        },
      },
      createdBy: "system",
      metadata: {
        systemTemplate: true,
        version: "1.0.0",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await createMCPTemplateFromTemplate(template);
    console.log(`${LOG_PREFIX} Agent query template created`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating agent query template:`, error);
    throw error;
  }
};
