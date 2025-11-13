const {assetPool} = require("../Config/db");
const { CustomError } = require("../Middleware/CustomeError");
const record = require("../Query/Records");

const TABLE = "statustypesub";

// Create StatusTypeSub
const createStatusTypeSub = async (table, columns, values) => {

  try {
    const statusTypeSub = await record.createRecord(table, columns, values);
    return statusTypeSub.insertId;
  } catch (error) {
    console.error("Error creating statusTypeSub:", error);
    throw error
  }
};

// Get all statusTypeSubs by tenant ID with pagination
const getAllStatusTypeSubsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw error
    }
    return await record.getAllRecords(
      TABLE,
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching statusTypeSubs:", error);
    throw error
  }
};

// Get statusTypeSub by tenant ID and statusTypeSub ID
const getStatusTypeSubByTenantAndStatusTypeSubId = async (
  tenant_id,
  statusTypeSub_id
) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "statusTypeSub_id",
      statusTypeSub_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching statusTypeSub:", error);
    throw error
  }
};

// Update statusTypeSub
const updateStatusTypeSub = async (
  statusTypeSub_id,
  columns,
  values,
  tenant_id
) => {
  try {
    const conditionColumn = ["tenant_id", "status_type_sub_id"];
    const conditionValue = [tenant_id, statusTypeSub_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating statusTypeSub:", error);
    throw error
  }
};

// Delete statusTypeSub
const deleteStatusTypeSubByTenantAndStatusTypeSubId = async (tenant_id, statusTypeSub_id) => {
  try {
    const conditionColumns = ["tenant_id", "status_type_sub_id"];
    const conditionValues = [tenant_id, statusTypeSub_id];

    const result = await record.deleteRecord(TABLE, conditionColumns, conditionValues);
  
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting statusTypeSub:", error);
    throw error
  }
};


const getAllStatusTypeSubByStatusTypeAndTenantId = async (
  tenant_id,
  status_type_id,
  status_type_sub
) => {
  const conn = await assetPool.getConnection();
  try {
    const result = await conn.query(
      "select * from statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
      [status_type_id, status_type_sub, tenant_id]
    );

    return result;
  } catch (err) {
    console.log(err.message);
    throw error
  } finally {
    conn.release();
  }
};

const getAllStatusTypeSubByTenantIdAndStatusTypeId = async (
  tenant_id,
  status_type_id,
  limit = 10,
  offset = 0
) => {
  const query = `
    SELECT * FROM statustypesub WHERE status_type_id = ? AND tenant_id = ? ORDER BY status_type_sub_ref ASC LIMIT ? OFFSET ?
  `;

  const conn = await assetPool.getConnection();
  try {

    const rows = await conn.query(query, [
      status_type_id,
      tenant_id,
      limit,
      offset,
    ]);

   

    return rows[0];
  } catch (error) {
    console.error("Error fetching status_type_id:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllStatusTypeSubByTenantIdAndStatusType = async (
  tenant_id,
  status_type,
  limit = 10,
  offset = 0
) => {
  const conn = await assetPool.getConnection();

  try {
    // Input validation
    if (!tenant_id || !status_type) {
      throw error
    }

    if (typeof limit !== "number" || limit < 1 || limit > 100) {
      limit = 10; // default
    }

    if (typeof offset !== "number" || offset < 0) {
      offset = 0; // default
    }

    const [rows] = await conn.query(
      "SELECT * FROM statustypesub WHERE status_type = ? AND tenant_id = ? ORDER BY status_type_sub_ref ASC LIMIT ? OFFSET ?",
      [status_type, tenant_id, limit, offset]
    );

    return rows;
  } catch (err) {
    console.error("Error fetching statustypesub:", err.message);
    throw error
  } finally {
    conn.release();
  }
};

//step2
const checkStatusTypeSubExistsByStatusTypeIdAndStatusTypeSubAndTenantId =
  async (tenant_id, status_type_id, status_type_sub) => {
    const conn = await assetPool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
        [status_type_id, status_type_sub, tenant_id]
      );

      return result.length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw error
    } finally {
      conn.release();
    }
  };

  const checkStatusTypeSubExistsByStatusTypeSubIdAndStatusTypeIdAndStatusTypeSubAndTenantId =
  async (tenant_id, status_type_id,status_type_sub_id, status_type_sub) => {
    const conn = await assetPool.getConnection();
    try {
      
      const result = await conn.query(
        "select 1 from goldloan.statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
        [status_type_id, status_type_sub, tenant_id]
      );

      return result.length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw error
    } finally {
      conn.release();
    }
  };

//step3
const checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndTenantId =
  async (tenant_id, status_type_id, status_type_sub) => {
    const conn = await assetPool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
        [status_type_id, status_type_sub, tenant_id]
      );

      return result[0].length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw error
    } finally {
      conn.release();
    }
  };

const checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId =
  async (tenant_id, status_type_sub_id, status_type_sub_ref) => {
    const conn = await assetPool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_sub_id!=? and status_type_sub_ref=? and tenant_id=? limit 1",
        [status_type_sub_id, status_type_sub_ref, tenant_id]
      );

      return result[0].length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw error
    } finally {
      conn.release();
    }
  };

module.exports = {
  createStatusTypeSub,
  getAllStatusTypeSubsByTenantId,
  getStatusTypeSubByTenantAndStatusTypeSubId,
  updateStatusTypeSub,
  deleteStatusTypeSubByTenantAndStatusTypeSubId,
  getAllStatusTypeSubByStatusTypeAndTenantId,
  checkStatusTypeSubExistsByStatusTypeIdAndStatusTypeSubAndTenantId,
  checkStatusTypeSubExistsByStatusTypeSubIdAndStatusTypeIdAndStatusTypeSubAndTenantId,
  checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndTenantId,
  checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId,
  getAllStatusTypeSubByTenantIdAndStatusTypeId,
  getAllStatusTypeSubByTenantIdAndStatusType,
};
