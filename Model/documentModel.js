const {assetPool} = require('../config/db');

const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");
const { buildCacheKey } = require("../Utils/RedisCache");

// Create a new document entry
const createDocument = async (table_name, table_id, field_name, file_url, created_by) => {
  const conn = await assetPool.getConnection();
  const cacheKey = buildCacheKey("document", table_name, table_id);

  try {
    const [result] = await conn.query(
      `INSERT INTO document (table_name, table_id, field_name, file_url, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [table_name, table_id, field_name, file_url, created_by]
    );

    await invalidateCacheByPattern(cacheKey); // Invalidate cache // Invalidate cache

    return result.insertId;
  } catch (error) {
    console.error("Error in createDocument:", error);
    throw error;
  } finally {
    conn.release();
  }
};

// Get documents by table name and ID (with Redis)
const getDocumentsByTableAndId = async (table_name, table_id) => {
  const cacheKey = buildCacheKey("document", table_name, table_id);

  try {
    const documents = await getOrSetCache(cacheKey, async () => {
      const conn = await assetPool.getConnection();
      try {
        const [rows] = await conn.query(
          `SELECT * FROM document WHERE table_name = ? AND table_id = ?`,
          [table_name, table_id]
        );
        return rows;
      } finally {
        conn.release();
      }
    });

    return documents
  } catch (error) {
    console.error("Error in getDocumentsByTableAndId:", error);
    throw error;
  }
};

// Get documents by field name
const getDocumentsByField = async (table_name, table_id, field_name) => {
  const conn = await assetPool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM document WHERE table_name = ? AND table_id = ? AND field_name = ?`,
      [table_name, table_id, field_name]
    );
    return rows;
  } catch (error) {
    console.error("Error in getDocumentsByField:", error);
    throw error;
  } finally {
    conn.release();
  }
};

// Update a document by ID
const updateDocument = async (document_id, file_url, updated_by) => {
  const conn = await assetPool.getConnection();
  try {
    const [result] = await conn.query(
      `UPDATE document SET file_url = ?, updated_by = ? WHERE document_id = ?`,
      [file_url, updated_by, document_id]
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error in updateDocument:", error);
    throw error;
  } finally {
    conn.release();
  }
};

// Delete all documents for a record
const deleteDocumentsByTableAndId = async (table_name, table_id) => {
  const conn = await assetPool.getConnection();
  const cacheKey = buildCacheKey("document", table_name, table_id);

  try {
    const [result] = await conn.query(
      `DELETE FROM document WHERE table_name = ? AND table_id = ?`,
      [table_name, table_id]
    );

    await invalidateCacheByPattern(cacheKey); // Invalidate cache

    return result.affectedRows;
  } catch (error) {
    console.error("Error in deleteDocumentsByTableAndId:", error);
    throw error;
  } finally {
    conn.release();
  }
};

// Delete a document by its ID
const deleteDocumentById = async (document_id) => {
  const conn = await assetPool.getConnection();
  try {
    const [result] = await conn.query(
      `DELETE FROM document WHERE document_id = ?`,
      [document_id]
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error in deleteDocumentById:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const updateDocumentDescription = async (document_id, description) => {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `UPDATE document SET description = ? WHERE document_id = ?`,
      [description, document_id]
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error in updateDocument:", error);
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  createDocument,
  getDocumentsByTableAndId,
  getDocumentsByField,
  updateDocument,
  deleteDocumentsByTableAndId,
  deleteDocumentById,
  updateDocumentDescription
};
