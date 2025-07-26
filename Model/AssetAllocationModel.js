const {assetPool} = require("../config/db");
const { CustomError } = require("../Middleware/CustomeError");
const record = require("../Query/Records");

const TABLE = "asset_allocation";

// Create AssetAllocation
const createAssetAllocation = async (table, columns, values) => {
  try {
    const assetAllocation = await record.createRecord(table, columns, values);

    return assetAllocation.insertId;
  } catch (error) {
    console.error("Error creating assetAllocation:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all assets by tenant ID with pagination
const getAllAssetAllocationsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(
      "asset_allocation",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw new CustomError("Error fetching assets.", 500);
  }
};

const getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId = async (
  tenantId,
  reference_type,
  reference_id,
  limit,
  offset
) => {
  const query1 = `SELECT * FROM asset_allocation  WHERE tenant_id = ? AND reference_type=? AND reference_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM asset_allocation  WHERE tenant_id = ? AND reference_type=? AND reference_id = ?`;
  const conn = await assetPool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      reference_type,
      reference_id,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      reference_type,
      reference_id,
    ]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Get assetAllocation by tenant ID and assetAllocation ID
// const getAssetAllocationByTenantAndAssetAllocationId = async (tenant_id, asset_allocation_id) => {
//   try {
//     const rows = await record.getRecordByIdAndTenantId(
//       TABLE,
//       "tenant_id",
//       tenant_id,
//       "asset_allocation_id",
//       asset_allocation_id
//     );
//     return rows;
//   } catch (error) {
//     console.error("Error fetching assetAllocation:", error);
//     throw new CustomError("Error fetching assetAllocation.", 500);
//   }
// };

const getAssetAllocationByTenantAndAssetAllocationId = async (
  tenant_id, asset_allocation_id
) => {
  console.log(tenant_id,asset_allocation_id)
  const query = `
  SELECT 
    a.*, 
    al.*
  FROM asset_allocation al 
  JOIN asset a ON a.asset_id = al.asset_id
  WHERE 
    al.tenant_id = ? AND 
    al.asset_allocation_id = ?
`;

  const conn = await assetPool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenant_id, asset_allocation_id]);
    console.log(rows)
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Update assetAllocation
const updateAssetAllocation = async (asset_allocation_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_allocation_id"];
    const conditionValue = [tenant_id, asset_allocation_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating assetAllocation:", error);
    throw new CustomError("Error updating assetAllocation.", 500);
  }
};

// Delete assetAllocation
const deleteAssetAllocationByTenantAndAssetAllocationId = async (tenant_id, asset_allocation_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_allocation_id"];
    const conditionValue = [tenant_id, asset_allocation_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting assetAllocation:", error);
    throw new CustomError("Error deleting assetAllocation.", 500);
  }
};

const getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate =
  async (
    tenant_id,
    reference_type,
    reference_id,
    start_date,
    end_date,
    limit,
    offset
  ) => {
    const query1 = `SELECT * FROM asset_allocation WHERE tenant_id = ? AND reference_type=? AND reference_id = ? AND created_time between ? AND ? limit ? offset ?`;
    const query2 = `SELECT count(*) as total FROM asset_allocation WHERE tenant_id = ? AND reference_type=? AND reference_id = ? AND created_time between ?`;
    const conn = await assetPool.getConnection();
    try {
      const [rows] = await conn.query(query1, [
        tenant_id,
        reference_type,
        reference_id,
        start_date,
        end_date,
        limit,
        offset,
      ]);
      const [counts] = await conn.query(query2, [
        tenant_id,
        reference_type,
        reference_id,
        start_date,
        end_date,
      ]);
      return { data: rows, total: counts[0].total };
    } catch (error) {
      console.error(error);
      throw new Error("Database Operation Failed");
    } finally {
      conn.release();
    }
  };

module.exports = {
  createAssetAllocation,
  getAllAssetAllocationsByTenantId,
  getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId,
  getAssetAllocationByTenantAndAssetAllocationId,
  updateAssetAllocation,
  deleteAssetAllocationByTenantAndAssetAllocationId,
  getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate,
};
