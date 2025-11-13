const {assetPool} = require("../Config/db");
const { CustomError } = require("../Middleware/CustomeError");
const helper = require("../Utils/Helpers");
const record = require("../Query/Records");

const TABLE = "statusType";

// Create StatusType
const createStatusType = async (table,columns, values) => {
  try {
    const statusType = await record.createRecord(table, columns, values);
    return statusType.insertId;
  } catch (error) {
    console.error("Error creating statusType:", error);
    throw error
  }
};

// Get all statusTypes by tenant ID with pagination

const getAllStatusTypesByTenantId = async () => {
  const query = `SELECT 
   *
FROM 
    statustype
`;
  const conn = await assetPool.getConnection();
  try {
    const [rows] = await conn.query(query,[]);
   
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getStatusTypeByStatusTypeId = async (status_type_id) => {
  const query = `SELECT * FROM statustype WHERE status_type_id=?
`;
  const conn = await assetPool.getConnection();
  try {
    const rows = await conn.query(query, [status_type_id]);
   
    return rows[0];
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};


const getAllStatusTypesByTenantAndPatientId = async (tenantId, patientId,limit,offset) => {
  const query = `SELECT *
FROM 
    statusType 
WHERE 
    tenant_id = ? AND 
    patient_id=?
    limit ? offset ? 
`;
  const conn = await assetPool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, patientId,limit,offset]);
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Update statusType
const updateStatusType = async (statusType_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "statusType_id"];
    const conditionValue = [tenant_id, statusType_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating statusType:", error);
    throw error
  }
};

// Delete statusType
const deleteStatusTypeByTenantAndStatusTypeId = async (tenant_id, statusType_id) => {
  try {
    const conditionColumn = ["tenant_id", "statusType_id"];
    const conditionValue = [tenant_id, statusType_id];

    const [result] = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting statusType:", error);
    throw error
  }
};

const getStatusTypeIdByTenantAndStatusType = async (status_type) => {
  const query = `
    SELECT status_type_id
    FROM statustype
    WHERE status_type = ?
  `;
  
  const conn = await assetPool.getConnection();
  try {
    const rows = await conn.query(query, [status_type]);
  
    
    return rows[0][0].status_type_id;
  } catch (error) {
    console.error("Error fetching status_type_id:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};



module.exports = {
  createStatusType,
  getAllStatusTypesByTenantId,
  getStatusTypeByStatusTypeId,
  updateStatusType,
  deleteStatusTypeByTenantAndStatusTypeId,
  getAllStatusTypesByTenantAndPatientId,
  getStatusTypeIdByTenantAndStatusType
};
