const {assetPool} = require("../config/db");
const { CustomError } = require("../Middleware/CustomeError");
const record = require("../Query/Records");

const TABLE = "asset";

// Create Asset
const createAsset = async (table, columns, values) => {
  try {
    const asset = await record.createRecord(table, columns, values);

    return asset.insertId;
  } catch (error) {
    console.error("Error creating asset:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all assets by tenant ID with pagination
const getAllAssetsByTenantId = async (tenantId, limit, offset) => {
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
      "asset",
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

const getAllAssetsByTenantIdAndReferenceTypeAndReferenceId = async (
  tenantId,
  reference_type,
  reference_id,
  limit,
  offset
) => {
  const query1 = `SELECT * FROM asset  WHERE tenant_id = ? AND reference_type=? AND reference_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM asset  WHERE tenant_id = ? AND reference_type=? AND reference_id = ?`;
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

// Get asset by tenant ID and asset ID
const getAssetByTenantAndAssetId = async (tenant_id, asset_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "asset_id",
      asset_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching asset:", error);
    throw new CustomError("Error fetching asset.", 500);
  }
};

// Update asset
const updateAsset = async (asset_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_id"];
    const conditionValue = [tenant_id, asset_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating asset:", error);
    throw new CustomError("Error updating asset.", 500);
  }
};

// Delete asset
const deleteAssetByTenantAndAssetId = async (tenant_id, asset_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_id"];
    const conditionValue = [tenant_id, asset_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting asset:", error);
    throw new CustomError("Error deleting asset.", 500);
  }
};

const getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate =
  async (
    tenant_id,
    reference_type,
    reference_id,
    start_date,
    end_date,
    limit,
    offset
  ) => {
    const query1 = `SELECT * FROM asset WHERE tenant_id = ? AND reference_type=? AND reference_id = ? AND purchased_date between ? AND ? limit ? offset ?`;
    const query2 = `SELECT count(*) as total FROM asset WHERE tenant_id = ? AND reference_type = ? AND reference_id = ? AND purchased_date BETWEEN ? AND ?`;
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
  createAsset,
  getAllAssetsByTenantId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceId,
  getAssetByTenantAndAssetId,
  updateAsset,
  deleteAssetByTenantAndAssetId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate,
};
