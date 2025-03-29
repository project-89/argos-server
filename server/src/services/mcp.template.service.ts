import { COLLECTIONS, ERROR_MESSAGES } from "../constants";
import { MCPTemplate, ListMCPTemplatesResponse } from "../schemas/mcp.schema";
import { ApiError, idFilter } from "../utils";
import { getDb, formatDocument, formatDocuments, serverTimestamp } from "../utils/mongodb";
import { ObjectId } from "mongodb";

const LOG_PREFIX = "[MCP Template Service]";

/**
 * Create a new MCP template
 */
export async function createMCPTemplate(
  template: Omit<MCPTemplate, "createdAt" | "updatedAt"> | MCPTemplate,
): Promise<MCPTemplate> {
  try {
    console.log(`${LOG_PREFIX} Creating MCP template:`, template.name);
    const db = await getDb();

    const now = serverTimestamp();
    const templateData: any = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    // If the template already has an ID, use it
    const templateId = template.id;
    let insertedId: string;

    if (templateId) {
      insertedId = templateId;
      // Convert string ID to ObjectId if needed
      if (!ObjectId.isValid(templateId)) {
        templateData._id = templateId;
      } else {
        templateData._id = new ObjectId(templateId);
      }
      delete templateData.id;

      // Check if it already exists
      const existingTemplate = await db
        .collection(COLLECTIONS.MCP_TEMPLATES)
        .findOne({ _id: templateData._id });

      if (existingTemplate) {
        // Update existing template
        await db
          .collection(COLLECTIONS.MCP_TEMPLATES)
          .updateOne({ _id: templateData._id }, { $set: templateData });
      } else {
        // Insert new template with specified ID
        await db.collection(COLLECTIONS.MCP_TEMPLATES).insertOne(templateData);
      }
    } else {
      // No ID provided, create a new one
      const result = await db.collection(COLLECTIONS.MCP_TEMPLATES).insertOne(templateData);
      insertedId = result.insertedId.toString();
    }

    return {
      ...template,
      id: insertedId,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Get an MCP template by ID
 */
export async function getMCPTemplate(templateId: string): Promise<MCPTemplate> {
  try {
    console.log(`${LOG_PREFIX} Getting MCP template:`, { templateId });
    const db = await getDb();

    const filter = idFilter(templateId);
    const templateDoc = await db.collection(COLLECTIONS.MCP_TEMPLATES).findOne(filter);

    if (!templateDoc) {
      throw new ApiError(404, ERROR_MESSAGES.NOT_FOUND);
    }

    return formatDocument<MCPTemplate>(templateDoc)!;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * List MCP templates with filtering
 */
export async function listMCPTemplates(
  options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ListMCPTemplatesResponse> {
  try {
    console.log(`${LOG_PREFIX} Listing MCP templates:`, options);
    const db = await getDb();

    const { category, limit = 20, offset = 0 } = options;

    // Build query
    const query: Record<string, any> = {};
    if (category) {
      query.category = category;
    }

    // Get total count
    const total = await db.collection(COLLECTIONS.MCP_TEMPLATES).countDocuments(query);

    // Get templates
    const templateDocs = await db
      .collection(COLLECTIONS.MCP_TEMPLATES)
      .find(query)
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      items: formatDocuments<MCPTemplate>(templateDocs),
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error listing MCP templates:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Update an MCP template
 */
export async function updateMCPTemplate(
  templateId: string,
  updates: Partial<MCPTemplate>,
): Promise<MCPTemplate> {
  try {
    console.log(`${LOG_PREFIX} Updating MCP template:`, { templateId });
    const db = await getDb();

    // Get existing template
    const template = await getMCPTemplate(templateId);

    const filter = idFilter(templateId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove id from updates if present
    if ("id" in updateData) {
      delete updateData.id;
    }

    await db.collection(COLLECTIONS.MCP_TEMPLATES).updateOne(filter, { $set: updateData });

    return {
      ...template,
      ...updates,
      updatedAt: updateData.updatedAt,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}

/**
 * Delete an MCP template
 */
export async function deleteMCPTemplate(templateId: string): Promise<boolean> {
  try {
    console.log(`${LOG_PREFIX} Deleting MCP template:`, { templateId });
    const db = await getDb();

    const filter = idFilter(templateId);
    const result = await db.collection(COLLECTIONS.MCP_TEMPLATES).deleteOne(filter);

    return result.deletedCount > 0;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting MCP template:`, error);
    throw ApiError.from(error, 500, ERROR_MESSAGES.INTERNAL_ERROR);
  }
}
