const { CustomError } = require("../Middleware/CustomeError");
const assetModel = require("../Model/AssetModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");

const helper = require("../Utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");
const { mapFields, patchRecord } = require("../Query/Records");
const {
  saveDocuments,
  handleFileCleanupByTable,
  updateDocumentsDiffBased,
} = require("../Utils/UploadFiles");
const { getDocumentsByField } = require("../Model/documentModel");

const assetFields = {
  tenant_id: (val) => val,
  source_app: (val) => val,
  reference_type: (val) => val,
  reference_id: (val) => val,

  asset_code: (val) => val,
  serial_number: (val) => val,
  model_number: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  category: (val) => val,
  manufacturer: (val) => val,

  asset_status: (val) => val,
  asset_condition: (val) => val,
  quantity: (val) => (val ? parseInt(val) : 0),
  price: (val) => (val ? parseFloat(val) : 0),

  year_of_manufacturing: (val) => val,
  appreciating: (val) => Boolean(val),
  depreciating: (val) => Boolean(val),
  next_service_date: (val) => formatDateOnly(val),
  colour: (val) => val,
  contact_name_number: (val) => val,
  insurance_provider: (val) => val,
  insurance_number: (val) => val,
  insurance_end_date: (val) => formatDateOnly(val),

  description: (val) => helper.safeStringify(val),
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
  model_number: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  category: (val) => val,
  manufacturer: (val) => val,

  asset_status: (val) => val,
  asset_condition: (val) => val,
  quantity: (val) => (val ? parseInt(val) : 0),
  price: (val) => (val ? parseFloat(val) : 0),

  year_of_manufacturing: (val) => val,
  appreciating: (val) => helper.parseBoolean(val),
  depreciating: (val) => helper.parseBoolean(val),
  next_service_date: (val) => (val ? formatDateOnly(val) : null),
  colour: (val) => val,
  contact_name_number: (val) => val,
  insurance_provider: (val) => val,
  insurance_number: (val) => val,
  insurance_end_date: (val) => (val ? formatDateOnly(val) : null),

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
    await saveDocuments({
      table_name: "asset",
      table_id: assetId,
      field_name: "asset_photo",
      files: data.asset_photo,
      created_by: data.created_by,
    });
    await saveDocuments({
      table_name: "asset",
      table_id: assetId,
      field_name: "asset_images",
      files: data.asset_images,
      created_by: data.created_by,
    });
    await invalidateCacheByPattern("asset:*");
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    throw new CustomError(error, 500);
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

    const convertedRows = await Promise.all(
      assets.data.map(async (asset) => {
        // Convert asset fields using reverse mapping
        const formatted = helper.convertDbToFrontend(
          asset,
          assetFieldsReverseMap
        );

        // Fetch asset_photo documents
        const photoDocs = await getDocumentsByField(
          "asset",
          asset.asset_id,
          "asset_photo"
        );

        // Fetch asset_images documents
        const imageDocs = await getDocumentsByField(
          "asset",
          asset.asset_id,
          "asset_images"
        );

        // Extract document_id and file_url for both
        const asset_photo = photoDocs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        const asset_images = imageDocs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          asset_photo,
          asset_images,
        };
      })
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
      const result =
        await assetModel.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId(
          tenantId,
          reference_type,
          reference_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = await Promise.all(
      assets.data.map(async (asset) => {
        // Convert asset fields using reverse mapping
        const formatted = helper.convertDbToFrontend(
          asset,
          assetFieldsReverseMap
        );

        // Fetch asset_photo documents
        const photoDocs = await getDocumentsByField(
          "asset",
          asset.asset_id,
          "asset_photo"
        );

        // Fetch asset_images documents
        const imageDocs = await getDocumentsByField(
          "asset",
          asset.asset_id,
          "asset_images"
        );

        // Extract document_id and file_url for both
        const asset_photo = photoDocs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        const asset_images = imageDocs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          asset_photo,
          asset_images,
        };
      })
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError(error, 500);
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

    const photoDocs = await getDocumentsByField(
      "asset",
      asset.asset_id,
      "asset_photo"
    );

    // Fetch asset_images documents
    const imageDocs = await getDocumentsByField(
      "asset",
      asset.asset_id,
      "asset_images"
    );

    // Extract document_id and file_url for both
    const asset_photo = photoDocs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    const asset_images = imageDocs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    return {
      ...convertedRows,
      asset_photo,
      asset_images,
    };
  } catch (error) {
    throw new CustomError(error, 500);
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

    // Save or update asset photo using document system
    await updateDocumentsDiffBased({
      table_name: "asset",
      table_id: assetId,
      field_name: "asset_photo",
      newFiles: Array.isArray(data.asset_photo)
        ? data.asset_photo
        : [data.asset_photo],
      updated_by: data.updated_by,
    });

    // Save or update asset photo using document system
    await updateDocumentsDiffBased({
      table_name: "asset",
      table_id: asset_images,
      field_name: "asset_images",
      newFiles: Array.isArray(data.asset_images)
        ? data.asset_images
        : [data.asset_images],
      updated_by: data.updated_by,
    });

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(error, 500);
  }
};

// Delete Asset
const deleteAssetByTenantIdAndAssetId = async (tenantId, assetId) => {
  try {
    await handleFileCleanupByTable("asset", assetId);
    const affectedRows = await assetModel.deleteAssetByTenantAndAssetId(tenantId, assetId);
    if (affectedRows === 0) {
      throw new CustomError(error, 500);
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(error, 500);
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
    page
  ) => {
    const cacheKey = buildCacheKey("asset", "list", {
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
          await assetModel.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate(
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

      const convertedRows = assets.data.map((asset) =>
        helper.convertDbToFrontend(asset, assetFieldsReverseMap)
      );

      return { data: convertedRows, total: assets.total };
    } catch (error) {
      console.error("Database error while fetching assets:", err);
      throw new CustomError(error, 500);
    }
  };
const getAllExpireAssetsByTenantIdAndReferenceTypeAndReferenceId = async (
  tenant_id,
  reference_type,
  reference_id
) => {
  const cacheKey = buildCacheKey("asset", "exoirelist", {
    tenant_id,
    reference_type: reference_type,
    reference_id: reference_id,
  });
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result =
        await assetModel.getAllExpireAssetsByTenantIdAndReferenceTypeAndReferenceId(
          tenant_id,
          reference_type,
          reference_id
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

module.exports = {
  createAsset,
  getAllAssetsByTenantId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceId,
  getAssetByTenantIdAndAssetId,
  updateAsset,
  deleteAssetByTenantIdAndAssetId,
  getAllExpireAssetsByTenantIdAndReferenceTypeAndReferenceId,
  getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate,
};
