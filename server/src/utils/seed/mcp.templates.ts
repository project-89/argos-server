import { MCPTemplate } from "../../schemas/mcp.schema";
import { COLLECTIONS } from "../../constants";
import { getDb, serverTimestamp } from "../mongodb";
import { ObjectId } from "mongodb";

const LOG_PREFIX = "[MCP Templates Seed]";

/**
 * Initial set of MCP templates to seed the database
 */
const mcpTemplates: Omit<MCPTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Agent Workflow",
    description: "Manage an AI agent's response workflow with pre and post processing",
    category: "ai-agents",
    codeTemplate: `
// An Agent Workflow Program
// This program manages how an AI agent processes user queries

// Configuration reference:
// - apiKey: Your API key for the LLM provider
// - model: The model to use (e.g., "claude-3-opus-20240229")
// - maxTokens: Maximum tokens in the response
// - temperature: Randomness of the response (0.0-1.0)

async function preProcess(userInput) {
  // Add timestamps, formatting, etc.
  console.log("Processing user input:", userInput);
  return {
    content: userInput,
    timestamp: new Date().toISOString(),
    metadata: {
      preprocessed: true
    }
  };
}

async function generateResponse(processedInput, config) {
  // This would call your LLM API
  console.log("Generating response with config:", config);
  
  try {
    // Simulate API call
    const response = "This is a response from the AI agent based on: " + processedInput.content;
    
    return {
      success: true,
      content: response,
      usage: {
        promptTokens: processedInput.content.length,
        completionTokens: response.length,
        totalTokens: processedInput.content.length + response.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function postProcess(aiResponse) {
  // Format the response, add citations, etc.
  console.log("Post-processing AI response");
  
  if (!aiResponse.success) {
    return {
      content: "Sorry, I encountered an error generating a response.",
      error: aiResponse.error
    };
  }
  
  // Add formatting, metadata, etc.
  return {
    content: aiResponse.content,
    timestamp: new Date().toISOString(),
    metadata: {
      postprocessed: true,
      usage: aiResponse.usage
    }
  };
}

// Main execution function
async function main(inputs, config) {
  const processedInput = await preProcess(inputs.userQuery);
  const aiResponse = await generateResponse(processedInput, config);
  const finalResponse = await postProcess(aiResponse);
  
  return finalResponse;
}

// Entry point called by the MCP runtime
export default async function run(inputs, context) {
  console.log("Starting agent workflow execution");
  return await main(inputs, context.configuration);
}`,
    configurationSchema: {
      type: "object",
      properties: {
        apiKey: {
          type: "string",
          description: "API key for the LLM provider",
        },
        model: {
          type: "string",
          description: "The model to use for generation",
          default: "claude-3-opus-20240229",
        },
        maxTokens: {
          type: "number",
          description: "Maximum tokens in the response",
          default: 1000,
        },
        temperature: {
          type: "number",
          description: "Randomness of the response (0.0-1.0)",
          default: 0.7,
        },
      },
      required: ["apiKey", "model"],
    },
    inputSchema: {
      type: "object",
      properties: {
        userQuery: {
          type: "string",
          description: "The user's input query",
        },
        sessionId: {
          type: "string",
          description: "Optional session identifier for conversation context",
        },
        systemPrompt: {
          type: "string",
          description: "Optional system prompt to guide the agent's behavior",
        },
      },
      required: ["userQuery"],
    },
    outputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The generated response",
        },
        timestamp: {
          type: "string",
          description: "ISO timestamp of when the response was generated",
        },
        metadata: {
          type: "object",
          description: "Additional response metadata",
        },
      },
    },
    createdBy: "system",
    isSystem: true,
    metadata: {},
  },
  {
    name: "Data Extraction",
    description: "Extract structured data from unstructured text inputs",
    category: "data-processing",
    codeTemplate: `
// Data Extraction Program
// This program extracts structured data from unstructured text

// Configuration reference:
// - schema: The JSON schema for extraction
// - extractionMethod: "regex" | "llm" | "hybrid"

const EXTRACTION_METHODS = {
  REGEX: "regex",
  LLM: "llm",
  HYBRID: "hybrid"
};

function extractWithRegex(text, patterns) {
  const results = {};
  
  for (const [field, pattern] of Object.entries(patterns)) {
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    results[field] = match ? match[1] : null;
  }
  
  return results;
}

async function extractWithLLM(text, schema, config) {
  // This would call an LLM to extract structured data
  console.log("Extracting data with LLM using schema:", schema);
  
  // Simulate LLM extraction based on the text and schema
  // In a real implementation, this would call an LLM API
  const fakeExtraction = {};
  
  // Generate some plausible values based on the schema
  for (const [field, definition] of Object.entries(schema.properties)) {
    if (text.toLowerCase().includes(field.toLowerCase())) {
      if (definition.type === "string") {
        fakeExtraction[field] = \`Extracted \${field}\`;
      } else if (definition.type === "number") {
        fakeExtraction[field] = Math.floor(Math.random() * 100);
      } else if (definition.type === "boolean") {
        fakeExtraction[field] = Math.random() > 0.5;
      }
    }
  }
  
  return fakeExtraction;
}

async function validateExtraction(extraction, schema) {
  const errors = [];
  
  for (const [field, definition] of Object.entries(schema.properties)) {
    if (schema.required?.includes(field) && extraction[field] === undefined) {
      errors.push(\`Required field '\${field}' is missing\`);
    }
    
    const value = extraction[field];
    if (value !== undefined && value !== null) {
      if (definition.type === "string" && typeof value !== "string") {
        errors.push(\`Field '\${field}' should be a string\`);
      } else if (definition.type === "number" && typeof value !== "number") {
        errors.push(\`Field '\${field}' should be a number\`);
      } else if (definition.type === "boolean" && typeof value !== "boolean") {
        errors.push(\`Field '\${field}' should be a boolean\`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Main execution function
async function extractData(inputs, config) {
  const { text } = inputs;
  const { schema, extractionMethod = EXTRACTION_METHODS.HYBRID, regexPatterns = {} } = config;
  
  let extraction = {};
  
  if (extractionMethod === EXTRACTION_METHODS.REGEX) {
    extraction = extractWithRegex(text, regexPatterns);
  } else if (extractionMethod === EXTRACTION_METHODS.LLM) {
    extraction = await extractWithLLM(text, schema, config);
  } else if (extractionMethod === EXTRACTION_METHODS.HYBRID) {
    // First try regex for the fields we have patterns for
    const regexResults = extractWithRegex(text, regexPatterns);
    
    // Then use LLM to fill in the gaps
    const llmResults = await extractWithLLM(text, schema, config);
    
    // Combine results, preferring regex results when available
    extraction = {
      ...llmResults,
      ...regexResults
    };
  }
  
  // Validate the extraction against the schema
  const validation = await validateExtraction(extraction, schema);
  
  return {
    extraction,
    valid: validation.valid,
    errors: validation.errors
  };
}

// Entry point called by the MCP runtime
export default async function run(inputs, context) {
  console.log("Starting data extraction with method:", context.configuration.extractionMethod);
  return await extractData(inputs, context.configuration);
}`,
    configurationSchema: {
      type: "object",
      properties: {
        schema: {
          type: "object",
          description: "JSON schema for the data to extract",
        },
        extractionMethod: {
          type: "string",
          enum: ["regex", "llm", "hybrid"],
          default: "hybrid",
          description: "Method to use for extraction",
        },
        regexPatterns: {
          type: "object",
          description: "Regex patterns for extraction keyed by field name",
          default: {},
        },
      },
      required: ["schema"],
    },
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to extract data from",
        },
      },
      required: ["text"],
    },
    outputSchema: {
      type: "object",
      properties: {
        extraction: {
          type: "object",
          description: "The extracted data",
        },
        valid: {
          type: "boolean",
          description: "Whether the extraction is valid according to the schema",
        },
        errors: {
          type: "array",
          description: "Validation errors if any",
        },
      },
    },
    createdBy: "system",
    isSystem: true,
    metadata: {},
  },
  {
    name: "Scheduled Task",
    description: "Run and monitor scheduled tasks with error handling and retry logic",
    category: "automation",
    codeTemplate: `
// Scheduled Task Program
// This program runs a task on a schedule with error handling and retry logic

// Configuration reference:
// - taskType: The type of task to run
// - maxRetries: Maximum number of retries for failed tasks
// - retryDelay: Delay between retries in milliseconds

// Task handlers for different task types
const taskHandlers = {
  // Fetch data from an endpoint
  async fetchData(config) {
    console.log("Fetching data from:", config.endpoint);
    
    // Simulate fetch operation
    if (Math.random() > 0.8) {
      throw new Error("Simulated fetch error");
    }
    
    return {
      data: "Fetched data at " + new Date().toISOString(),
      source: config.endpoint
    };
  },
  
  // Process data according to rules
  async processData(data, config) {
    console.log("Processing data with rules:", config.rules);
    
    // Simulate processing
    if (Math.random() > 0.9) {
      throw new Error("Simulated processing error");
    }
    
    return {
      ...data,
      processed: true,
      rules: config.rules
    };
  },
  
  // Store results
  async storeResults(results, config) {
    console.log("Storing results to:", config.destination);
    
    // Simulate storage
    if (Math.random() > 0.95) {
      throw new Error("Simulated storage error");
    }
    
    return {
      success: true,
      destination: config.destination,
      timestamp: new Date().toISOString()
    };
  }
};

// Retry logic wrapper
async function withRetry(fn, maxRetries, retryDelay) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(\`Attempt \${attempt}/\${maxRetries + 1} failed: \${error.message}\`);
      lastError = error;
      
      if (attempt <= maxRetries) {
        console.log(\`Retrying in \${retryDelay}ms...\`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError;
}

// Main execution function
async function runScheduledTask(inputs, config) {
  const {
    taskType,
    maxRetries = 3,
    retryDelay = 1000,
    ...taskConfig
  } = config;
  
  const logs = [];
  
  const log = (message, level = "info") => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    logs.push(entry);
    console.log(\`[\${level.toUpperCase()}] \${message}\`);
  };
  
  log(\`Starting scheduled task: \${taskType}\`);
  
  try {
    let result;
    
    // Run the appropriate task with retry logic
    if (taskType === "fetch") {
      result = await withRetry(
        () => taskHandlers.fetchData(taskConfig),
        maxRetries,
        retryDelay
      );
      
      log("Fetch completed successfully");
      
      // If configured to process data after fetching
      if (taskConfig.processAfterFetch) {
        log("Processing fetched data");
        result = await withRetry(
          () => taskHandlers.processData(result, taskConfig),
          maxRetries,
          retryDelay
        );
        log("Processing completed successfully");
      }
      
      // If configured to store results
      if (taskConfig.storeResults) {
        log("Storing processed results");
        const storageResult = await withRetry(
          () => taskHandlers.storeResults(result, taskConfig),
          maxRetries,
          retryDelay
        );
        log("Storage completed successfully");
        result = { ...result, storage: storageResult };
      }
    } else if (taskType === "process") {
      if (!inputs.data) {
        throw new Error("No data provided for processing task");
      }
      
      result = await withRetry(
        () => taskHandlers.processData(inputs.data, taskConfig),
        maxRetries,
        retryDelay
      );
      
      log("Processing completed successfully");
    } else {
      throw new Error(\`Unknown task type: \${taskType}\`);
    }
    
    log("Task completed successfully");
    
    return {
      success: true,
      result,
      logs
    };
  } catch (error) {
    log(\`Task failed: \${error.message}\`, "error");
    
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      },
      logs
    };
  }
}

// Entry point called by the MCP runtime
export default async function run(inputs, context) {
  console.log("Starting scheduled task execution");
  return await runScheduledTask(inputs, context.configuration);
}`,
    configurationSchema: {
      type: "object",
      properties: {
        taskType: {
          type: "string",
          enum: ["fetch", "process"],
          description: "Type of task to run",
        },
        maxRetries: {
          type: "number",
          description: "Maximum number of retries for failed tasks",
          default: 3,
        },
        retryDelay: {
          type: "number",
          description: "Delay between retries in milliseconds",
          default: 1000,
        },
        endpoint: {
          type: "string",
          description: "For fetch tasks, the endpoint URL",
        },
        rules: {
          type: "array",
          description: "For process tasks, the processing rules",
        },
        destination: {
          type: "string",
          description: "For tasks that store results, the destination",
        },
        processAfterFetch: {
          type: "boolean",
          description: "Whether to process data after fetching",
          default: false,
        },
        storeResults: {
          type: "boolean",
          description: "Whether to store results after processing",
          default: false,
        },
      },
      required: ["taskType"],
    },
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Data to process (for process tasks)",
        },
        params: {
          type: "object",
          description: "Additional parameters for the task",
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the task was successful",
        },
        result: {
          type: "object",
          description: "The result of the task",
        },
        error: {
          type: "object",
          description: "Error information if the task failed",
        },
        logs: {
          type: "array",
          description: "Logs from the task execution",
        },
      },
    },
    createdBy: "system",
    isSystem: true,
    metadata: {},
  },
];

/**
 * Seed MCP templates into the database
 */
export async function seedMCPTemplates(): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Seeding MCP templates...`);
    const db = await getDb();

    const collection = db.collection(COLLECTIONS.MCP_TEMPLATES);

    // Check if templates already exist
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`${LOG_PREFIX} Templates already exist, skipping seeding`);
      return;
    }

    // Prepare templates with timestamps
    const now = serverTimestamp();
    const templatesWithTimestamps = mcpTemplates.map((template) => ({
      ...template,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    }));

    // Insert all templates
    const result = await collection.insertMany(templatesWithTimestamps);

    console.log(`${LOG_PREFIX} Successfully seeded ${result.insertedCount} MCP templates`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error seeding MCP templates:`, error);
  }
}
