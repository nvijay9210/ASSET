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
    throw error;
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
      throw error;
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
    throw error;
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
    throw error
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
//     throw error;
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
    throw error
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
    throw error;
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
    throw error;
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
      throw error
    } finally {
      conn.release();
    }
  };

const getAllAssetAndAllocationsByTenantId =
  async (
    tenant_id
  ) => {
    const query1 = `SELECT 
    -- asset table fields
    a.asset_id,
    a.tenant_id,
    a.source_app,
    a.reference_type,
    a.reference_id,
    a.asset_code,
    a.serial_number,
    a.model_number,
    a.asset_name,
    a.asset_photo,
    a.asset_type,
    a.category,
    a.manufacturer,
    a.asset_status,
    a.asset_condition,
    a.quantity,
    a.price,
    a.year_of_manufacturing,
    a.appreciating,
    a.depreciating,
    a.next_service_date,
    a.colour,
    a.contact_name_number,
    a.insurance_number,
    a.insurance_provider,
    a.insurance_end_date,
    a.description,
    a.allocated_to AS asset_allocated_to,
    a.purchased_date,
    a.purchased_by,
    a.vendor_name,
    a.warranty_expiry,
    a.expired_date,
    a.invoice_number,
    a.location,
    a.remarks AS asset_remarks,
    a.created_by AS asset_created_by,
    a.created_time AS asset_created_time,
    a.updated_by AS asset_updated_by,
    a.updated_time AS asset_updated_time,

    -- asset_allocation table fields
    aa.asset_allocation_id,
    aa.asset_allocation_quantity,
    aa.allocated_to AS allocation_allocated_to,
    aa.allocated_by,
    aa.allocation_date,
    aa.expected_return_date,
    aa.actual_return_date,
    aa.status,
    aa.remarks AS assetallocation_remarks,
    aa.asset_allocation_comments,
    aa.created_by AS allocation_created_by,
    aa.created_time AS allocation_created_time,
    aa.updated_by AS allocation_updated_by,
    aa.updated_time AS allocation_updated_time

FROM asset_allocation aa
LEFT JOIN asset a 
       ON a.asset_id = aa.asset_id
WHERE aa.tenant_id = ?;
`;
    
    const conn = await assetPool.getConnection();
    try {
      const [rows] = await conn.query(query1, [
        tenant_id
      ]);
      return rows
    } catch (error) {
      console.error(error);
      throw error
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
 getAllAssetAndAllocationsByTenantId

};
