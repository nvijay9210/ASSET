const { CustomError } = require("../Middleware/CustomeError");
const assetModel = require("../Model/AssetAllocationModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");

const helper = require("../Utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");
const { mapFields } = require("../query/Records");

const assetAllocationFields = {
  tenant_id: (val) => val,
  asset_id: (val) => val,
  reference_type: (val) => val,
  reference_id: (val) => val,

  allocated_to: (val) => val,
  allocated_by: (val) => val,
  allocation_date: (val) => val,
  expected_return_date: (val) => val,
  actual_return_date: (val) => val,
  status: (val) => val,
  remarks: (val) => val,

  created_by: (val) => val,
  updated_by: (val) => val,
};

const assetAllocationFieldsReverseMap = {
  asset_allocation_id: (val) => val,
  tenant_id: (val) => val,
  asset_id: (val) => val,
  reference_type: (val) => val,
  reference_id: (val) => val,

  allocated_to: (val) => val,
  allocated_by: (val) => val,
  allocation_date: (val) => (val ? formatDateOnly(val) : null),
  expected_return_date: (val) => (val ? formatDateOnly(val) : null),
  actual_return_date: (val) => (val ? formatDateOnly(val) : null),
  status: (val) => val,
  remarks: (val) => val,

  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Field mapping for assets (similar to treatment)

// Create AssetAllocationAllocation
const createAssetAllocation = async (data) => {
  const fieldMap = {
    ...assetAllocationFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const assetAllocationId = await assetModel.createAssetAllocation(
      "asset_allocation",
      columns,
      values
    );
    await invalidateCacheByPattern("assetAllocation:*");
    return assetAllocationId;
  } catch (error) {
    console.error("Failed to create assetAllocation:", error);
    throw new CustomError(
      `Failed to create assetAllocation: ${error.message}`,
      404
    );
  }
};

// Get All AssetAllocations by Tenant ID with Caching
const getAllAssetAllocationsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("assetAllocation", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetAllocationsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = assets.data.map((assetAllocation) =>
      helper.convertDbToFrontend(assetAllocation, assetAllocationFieldsReverseMap)
    );

    return { data: convertedRows, total: assets.total };
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 404);
  }
};

const getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId = async (
  tenantId,
  reference_type,
  reference_id,
  page,
  limit
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("assetAllocation", "list", {
    tenant_id: tenantId,
    reference_id,
    page,
    limit,
  });

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result =
        await assetModel.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId(
          tenantId,
          reference_type,
          reference_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = assets.data.map((assetAllocation) =>
      helper.convertDbToFrontend(assetAllocation, assetAllocationFieldsReverseMap)
    );

    return { data: convertedRows, total: assets.total };
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 404);
  }
};

// Get AssetAllocationAllocation by ID & Tenant
const getAssetAllocationByTenantIdAndAssetAllocationId = async (tenantId, assetAllocationId) => {
  try {
    const assetAllocation = await assetModel.getAssetAllocationByTenantAndAssetAllocationId(
      tenantId,
      assetAllocationId
    );
    const convertedRows = helper.convertDbToFrontend(
      assetAllocation,
      assetAllocationFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(
      "Failed to get assetAllocation: " + error.message,
      404
    );
  }
};

// Update AssetAllocation
const updateAssetAllocation = async (assetAllocationId, data, tenant_id) => {
  const fieldMap = {
    ...assetAllocationFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);

    const affectedRows = await assetModel.updateAssetAllocation(
      assetAllocationId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(
        "AssetAllocation not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("assetAllocation:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update assetAllocation", 404);
  }
};

// Delete AssetAllocation
const deleteAssetAllocationByTenantIdAndAssetAllocationId = async (tenantId, assetAllocationId) => {
  try {
    const affectedRows = await assetModel.deleteAssetAllocationByTenantAndAssetAllocationId(
      tenantId,
      assetAllocationId
    );
    if (affectedRows === 0) {
      throw new CustomError("AssetAllocation not found.", 404);
    }

    await invalidateCacheByPattern("assetAllocation:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete assetAllocation: ${error.message}`,
      404
    );
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
    page
  ) => {
    const cacheKey = buildCacheKey("assetAllocation", "list", {
      tenant_id,
      reference_type: reference_type,
      reference_id: reference_id,
      start_date,
      end_date,
      limit,
      page,
    });
    const offset = (page - 1) * limit;
    try {
      const assets = await getOrSetCache(cacheKey, async () => {
        const result =
          await assetModel.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate(
            tenant_id,
            reference_type,
            reference_id,
            start_date,
            end_date,
            Number(limit),
            offset
          );
        return result;
      });

      const convertedRows = assets.data.map((assetAllocation) =>
        helper.convertDbToFrontend(assetAllocation, assetAllocationFieldsReverseMap)
      );

      return { data: convertedRows, total: assets.total };
    } catch (err) {
      console.error("Database error while fetching assets:", err);
      throw new CustomError("Failed to fetch assets", 404);
    }
  };

module.exports = {
  createAssetAllocation,
  getAllAssetAllocationsByTenantId,
  getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId,
  getAssetAllocationByTenantIdAndAssetAllocationId,
  updateAssetAllocation,
  deleteAssetAllocationByTenantIdAndAssetAllocationId,
  getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate,
};
