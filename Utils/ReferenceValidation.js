const { assetDb, dentalDb, goldDb } = require("../config/db");

const getDbByReferenceType = (type) => {
  switch (type.toLowerCase()) {
    case "clinic":
      return { db: dentalDb, table: "clinic", idColumn: "clinic_id" };
    case "dentist":
      return { db: dentalDb, table: "dentist", idColumn: "dentist_id" };
    case "receptionist":
      return { db: dentalDb, table: "reception", idColumn: "reception_id" };
    case "branch":
      return { db: goldDb, table: "branch", idColumn: "branch_id" };
    default:
      return { db: assetDb, table: "", idColumn: "" };
  }
};

/**
 * Validates if the reference ID exists in the corresponding database.
 * @param {string} referenceType - Type like 'clinic', 'branch', etc.
 * @param {number|string} referenceId - ID to validate
 * @param {number|string} tenantId - Tenant ID to scope the search
 * @returns {Promise<boolean>}
 */
const validateReference = async (referenceType, referenceId, tenantId) => {
  const { db, table, idColumn } = getDbByReferenceType(referenceType);

  if (!table || !idColumn) return false;

  try {
    const [rows] = await db.query(
      `SELECT 1 FROM ${table} WHERE ${idColumn} = ? AND tenant_id = ? LIMIT 1`,
      [referenceId, tenantId]
    );

    return rows.length > 0;
  } catch (error) {
    console.error("Reference validation error:", error);
    return false;
  }
};

module.exports = {
  validateReference,
};
