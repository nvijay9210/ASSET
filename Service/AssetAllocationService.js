const { CustomError } = require("../Middleware/CustomeError");
const assetModel = require("../Model/AssetAllocationModel");
const { assetPool } = require("../config/db");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");

const helper = require("../Utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");
const { mapFields } = require("../Query/Records");
const {
  updateAssetQuantity,
  getAssetByTenantAndAssetId,
} = require("../Model/AssetModel");

const assetAllocationFields = {
  tenant_id: (val) => val,
  asset_id: (val) => val,
  asset_allocation_quantity: (val) => (val ? parseInt(val) : 0),
  reference_type: (val) => val,
  reference_id: (val) => val,
  allocated_to: (val) => val,
  allocated_by: (val) => val,
  allocation_date: (val) => formatDateOnly(val),
  expected_return_date: (val) => formatDateOnly(val),
  actual_return_date: (val) => formatDateOnly(val),
  status: (val) => val,
  remarks: (val) => val,
  asset_allocation_comments: (val) => val,
};

const assetAllocationFieldsReverseMap = {
  asset_allocation_id: (val) => val,
  tenant_id: (val) => val,
  asset_id: (val) => val,
  asset_allocation_quantity: (val) => (val ? parseInt(val) : 0),
  reference_type: (val) => val,
  reference_id: (val) => val,
  allocated_to: (val) => val,
  allocated_by: (val) => val,
  allocation_date: (val) => (val ? formatDateOnly(val) : null),
  expected_return_date: (val) => (val ? formatDateOnly(val) : null),
  actual_return_date: (val) => (val ? formatDateOnly(val) : null),
  status: (val) => val,
  remarks: (val) => val,
  asset_allocation_comments: (val) => val,

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
  const conn=await assetPool.getConnection()
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const assetAllocationId = await assetModel.createAssetAllocation(
      conn,
      "asset_allocation",
      columns,
      values
    );
    const asset = await getAssetByTenantAndAssetId(
      data.tenant_id,
      data.asset_id
    );
    await updateAssetQuantity(
      data.tenant_id,
      data.asset_id,
      Number(asset.quantity - data.asset_allocation_quantity)
    );
    await invalidateCacheByPattern("assetAllocation:*");
    conn.commit();
    return assetAllocationId;
  } catch (error) {
    conn.rollback()
    console.error("Failed to create assetAllocation:", error);
    throw new CustomError(error, 500);
  }
  finally{
    conn.release()
  }
};

// Get All AssetAllocations by Tenant ID with Caching
const getAllAssetAllocationsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
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
      helper.convertDbToFrontend(
        assetAllocation,
        assetAllocationFieldsReverseMap
      )
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);
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
      helper.convertDbToFrontend(
        assetAllocation,
        assetAllocationFieldsReverseMap
      )
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);
  }
};

// Get AssetAllocationAllocation by ID & Tenant
const getAssetAllocationByTenantIdAndAssetAllocationId = async (
  tenantId,
  assetAllocationId
) => {
  try {
    const assetAllocation =
      await assetModel.getAssetAllocationByTenantAndAssetAllocationId(
        tenantId,
        assetAllocationId
      );

    const convertedRows = {
      ...assetAllocation,
      description: assetAllocation?.description && helper.safeJsonParse(assetAllocation?.description),
      purchased_date: assetAllocation?.purchased_date && formatDateOnly(assetAllocation.purchased_date),
      allocation_date: assetAllocation?.allocation_date && formatDateOnly(assetAllocation.allocation_date),
      expected_return_date: assetAllocation?.expected_return_date && formatDateOnly(
        assetAllocation.expected_return_date
      ),
      actual_return_date: assetAllocation?.actual_return_date && formatDateOnly(assetAllocation.actual_return_date),
      next_service_date: assetAllocation?.next_service_date && formatDateOnly(assetAllocation.next_service_date),
      insurance_end_date: assetAllocation?.insurance_end_date && formatDateOnly(assetAllocation.insurance_end_date),
    };

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
  const conn=await assetPool.getConnection()
  try {
    const { columns, values } = mapFields(data, fieldMap);

    const assetAllocation =
      await getAssetAllocationByTenantIdAndAssetAllocationId(
        tenant_id,
        assetAllocationId
      );

    const affectedRows = await assetModel.updateAssetAllocation(
      conn,
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

    console.log('assetAllocation:',assetAllocation)

    if (
      Number(assetAllocation.asset_allocation_quantity) !==
      Number(data.asset_allocation_quantity)
    ) {
      const asset = await getAssetByTenantAndAssetId(tenant_id,data.asset_id, );
      const newQuantity =
        Number(asset.quantity)+Number(assetAllocation.asset_allocation_quantity) - Number(data.asset_allocation_quantity);

      await updateAssetQuantity(tenant_id, data.asset_id, newQuantity);
    }

    await invalidateCacheByPattern("assetAllocation:*");
    conn.commit()
    return affectedRows;
  } catch (error) {
    conn.rollback()
    console.error("Update Error:", error);
    throw new CustomError(error, 500);
  }
  finally{
    conn.release()
  }
};

// Delete AssetAllocation
const deleteAssetAllocationByTenantIdAndAssetAllocationId = async (
  tenantId,
  assetAllocationId
) => {
  try {
    const affectedRows =
      await assetModel.deleteAssetAllocationByTenantAndAssetAllocationId(
        tenantId,
        assetAllocationId
      );
    if (affectedRows === 0) {
      throw new CustomError(error, 500);
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
        helper.convertDbToFrontend(
          assetAllocation,
          assetAllocationFieldsReverseMap
        )
      );

      return { data: convertedRows, total: assets.total };
    } catch (error) {
      console.error("Database error while fetching assets:", err);
      throw new CustomError(error, 500);
    }
  };

const getAllAssetAndAllocationsByTenantId = async (tenant_id, asset_id) => {
  const cacheKey = buildCacheKey("assetAllocation-assetandAllocation", "list", {
    tenant_id,
    asset_id: asset_id,
  });
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetAndAllocationsByTenantId(
        tenant_id
      );
      return result;
    });

    const convertedRows = assets.map((assetAllocation) => ({
      ...assetAllocation,
      next_service_date: formatDateOnly(assetAllocation.next_service_date),
      insurance_end_date: formatDateOnly(assetAllocation.insurance_end_date),
      purchased_date: formatDateOnly(assetAllocation.purchased_date),
      expired_date: formatDateOnly(assetAllocation.expired_date),
      allocation_date: formatDateOnly(assetAllocation.allocation_date),
      expected_return_date: formatDateOnly(
        assetAllocation.expected_return_date
      ),
      actual_return_date: formatDateOnly(assetAllocation.actual_return_date),
      description:
        assetAllocation.description &&
        helper.safeJsonParse(assetAllocation.description),
      remarks:
        assetAllocation.remarks &&
        helper.safeJsonParse(assetAllocation.remarks),
      asset_allocation_comments:
        assetAllocation.asset_allocation_comments &&
        helper.safeJsonParse(assetAllocation.asset_allocation_comments),
    }));

    return convertedRows;
  } catch (error) {
    console.error("Database error while fetching assets:", error);
    throw new CustomError(error, 500);
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
  getAllAssetAndAllocationsByTenantId,
};
