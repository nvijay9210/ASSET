const { CustomError } = require("../Middleware/CustomeError");
const statusTypeModel = require("../Model/StatusTypeModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");
const helper = require("../Utils/Helpers");
const { convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");

const statusTypeField = {
  tenant_id: (val) => val,
  status_type: (val) => val,
};
const statusTypeFieldReverseMap = {
  status_type_id:val=>val,
  tenant_id: (val) => val,
  status_type: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create StatusType
const createStatusType = async (data) => {
  
  const fieldMap = {
    statusTypeField,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const statusTypeId = await statusTypeModel.createStatusType(
      "statusType",
      columns,
      values
    );
    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return statusTypeId;
  } catch (error) {
    console.error("Failed to create statusType:", error);
    throw new CustomError(err, 500);
  }
};

// Get All StatusTypes by Tenant ID with Caching
const getAllStatusTypesByTenantId = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("statustype", "list", {
    page,
    limit,
  });

  try {
    const statusTypes = await getOrSetCache(cacheKey, async () => {
      const result = await statusTypeModel.getAllStatusTypesByTenantId(
      );
      return result;
    });

    const convertedRows = statusTypes.map((statusType) =>
          helper.convertDbToFrontend(statusType, statusTypeFieldReverseMap)
        );
    
        return convertedRows;
  } catch (err) {
    console.error("Database error while fetching statusTypes:", err);
    throw new CustomError(err, 500);
  }
};

// Get StatusType by ID & Tenant
const getStatusTypeByStatusTypeId = async (statusTypeId) => {
  try {
    const statusType = await statusTypeModel.getStatusTypeByStatusTypeId(
      statusTypeId
    );
    const convertedRows=helper.convertDbToFrontend(statusType, statusTypeFieldReverseMap)
    return {data:convertedRows,total:statusType.total};;
  } catch (error) {
    throw new CustomError(err, 500);
  }
};

// Update StatusType
const updateStatusType = async (statusTypeId, data, tenant_id) => {
  const fieldMap = {
    statusTypeField,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await statusTypeModel.updateStatusType(
      statusTypeId,
      columns,
      values,
      tenant_id
    );

    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
  }
};

// Delete StatusType
const deleteStatusTypeByTenantIdAndStatusTypeId = async (
  tenantId,
  statusTypeId
) => {
  try {
    const affectedRows =
      await statusTypeModel.deleteStatusTypeByTenantAndStatusTypeId(
        tenantId,
        statusTypeId
      );
    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(err, 500);
  }
};

module.exports = {
  createStatusType,
  getAllStatusTypesByTenantId,
  getStatusTypeByStatusTypeId,
  updateStatusType,
  deleteStatusTypeByTenantIdAndStatusTypeId,
};
