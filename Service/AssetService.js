const { CustomError } = require("../Middleware/CustomeError");
const assetModel = require("../Model/AssetModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");

const helper = require("../Utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");
const { mapFields } = require("../Query/Records");

const assetFields = {
  tenant_id: (val) => val,
  source_app: (val) => val,
  reference_type: (val) => val,
  reference_id: (val) => val,

  asset_code: (val) => val,
  serial_number: (val) => val,
  model: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  category: (val) => val,
  manufacturer: (val) => val,

  asset_status: (val) => val,
  asset_condition: (val) => val,
  quantity: (val) => (val ? parseInt(val) : 0),
  price: (val) => (val ? parseFloat(val) : 0),

  asset_photo: (val) => val,
  asset_image_url: (val) => helper.safeStringify(val),

  description:  (val) => helper.safeStringify(val),
  allocated_to: (val) => val,

  purchased_date: (val) => formatDateOnly(val),
  purchased_by: (val) => val,
  vendor_name: (val) => val,
  warranty_expiry: (val) => formatDateOnly(val),
  expired_date: (val) => formatDateOnly(val),
  invoice_number: (val) => val,
  location: (val) => val,
  remarks: (val) => val,
};

const assetFieldsReverseMap = {
  asset_id: (val) => val,

  tenant_id: (val) => val,
  source_app: (val) => val,
  reference_type: (val) => val,
  reference_id: (val) => val,

  asset_code: (val) => val,
  serial_number: (val) => val,
  model: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  category: (val) => val,
  manufacturer: (val) => val,

  asset_status: (val) => val,
  asset_condition: (val) => val,
  quantity: (val) => (val ? parseInt(val) : 0),
  price: (val) => (val ? parseFloat(val) : 0),

  asset_photo: (val) => val,
  asset_image_url: (val) => helper.safeJsonParse(val),

  description: (val) => helper.safeJsonParse(val),
  allocated_to: (val) => val,

  purchased_date: (val) => (val ? formatDateOnly(val) : null),
  purchased_by: (val) => val,
  vendor_name: (val) => val,
  warranty_expiry: (val) => (val ? formatDateOnly(val) : null),
  expired_date: (val) => (val ? formatDateOnly(val) : null),
  invoice_number: (val) => val,
  location: (val) => val,
  remarks: (val) => val,

  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Field mapping for assets (similar to treatment)

// Create Asset
const createAsset = async (data) => {
  const fieldMap = {
    ...assetFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const assetId = await assetModel.createAsset("asset", columns, values);
    await invalidateCacheByPattern("asset:*");
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    throw new CustomError(error, 500);;
  }
};

// Get All Assets by Tenant ID with Caching
const getAllAssetsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("asset", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = assets.data.map((asset) =>
      helper.convertDbToFrontend(asset, assetFieldsReverseMap)
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);
  }
};

const getAllAssetsByTenantIdAndReferenceTypeAndReferenceId = async (
  tenantId,
  reference_type,
  reference_id,
  page,
  limit
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("asset", "list", {
    tenant_id: tenantId,
    reference_id,
    page,
    limit,
  });

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId(
        tenantId,
        reference_type,
        reference_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = assets.data.map((asset) =>
      helper.convertDbToFrontend(asset, assetFieldsReverseMap)
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);;
  }
};

// Get Asset by ID & Tenant
const getAssetByTenantIdAndAssetId = async (tenantId, assetId) => {
  try {
    const asset = await assetModel.getAssetByTenantAndAssetId(
      tenantId,
      assetId
    );
    const convertedRows = helper.convertDbToFrontend(
      asset,
      assetFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(error, 500);;
  }
};

// Update Asset
const updateAsset = async (assetId, data, tenant_id) => {
  const fieldMap = {
    ...assetFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);

    const affectedRows = await assetModel.updateAsset(
      assetId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(error, 500);;
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(error, 500);;
  }
};

// Delete Asset
const deleteAssetByTenantIdAndAssetId = async (tenantId, assetId) => {
  try {
    const affectedRows = await assetModel.deleteAssetByTenantAndAssetId(
      tenantId,
      assetId
    );
    if (affectedRows === 0) {
      throw new CustomError(error, 500);;
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(error, 500);;
  }
};

const getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate = async (
  tenant_id,reference_type,reference_id, start_date, end_date,limit,page
) => {
  const cacheKey = buildCacheKey("asset", "list", {
    tenant_id,reference_type:reference_type,reference_id:reference_id, start_date, end_date,limit,page
  });
  const offset = (page - 1) * limit;
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result =
        await assetModel.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate(
          tenant_id,reference_type,reference_id, start_date, end_date,Number(limit),offset
        );
      return result;
    });

    const convertedRows = assets.data.map((asset) =>
      helper.convertDbToFrontend(asset, assetFieldsReverseMap)
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);;
  }
};

module.exports = {
  createAsset,
  getAllAssetsByTenantId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceId,
  getAssetByTenantIdAndAssetId,
  updateAsset,
  deleteAssetByTenantIdAndAssetId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate,
};
