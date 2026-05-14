const { CustomError } = require("../Middleware/CustomeError");
const { assetPool } = require("../Config/db");
const assetModel = require("../Model/AssetModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../Config/redisConfig");

const helper = require("../Utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../Utils/DateUtils");
const { buildCacheKey } = require("../Utils/RedisCache");

const {
  saveDocuments,
  handleFileCleanupByTable,
  updateDocumentsDiffBased,
  updateSingleDocument2,
} = require("../Utils/UploadFiles");
const { getDocumentsByField } = require("../Model/documentModel");
const { mapFields } = require("../Query/Records");

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
  asset_photo: (val) => val,

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
  asset_photo: (val) => val,

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

  const connection = await assetPool.getConnection();
  try {
    await connection.beginTransaction();
    const { columns, values } = mapFields(data, fieldMap);
    const assetId = await assetModel.createAsset(
      connection,
      "asset",
      columns,
      values
    );

    if (data?.asset_images) {
      await saveDocuments({
        table_name: "asset",
        table_id: assetId,
        field_name: "asset_images",
        files: data.asset_images,
        created_by: data.created_by,
      });
    }
    await invalidateCacheByPattern("asset:*");
    await connection.commit();
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    connection.rollback();
    throw new CustomError(error, 500);
  } finally {
    connection.release();
  }
};

// Get All Assets by Tenant ID with Caching
const axios = require("axios");

const getAllAssetsByTenantId = async (
  tenant_id,
  asset_id
) => {

  const cacheKey = buildCacheKey(
    "assetAllocation-assetandAllocation",
    "list",
    {
      tenant_id,
      asset_id,
    }
  );

  try {

    let assets = await getOrSetCache(
      cacheKey,
      async () => {
        return await assetModel.getAllAssetsByTenantId(
          tenant_id
        );
      }
    );

    assets = assets.data || [];

    console.log("Assets fetched from DB:", assets);

    let clinicData = null;

    // Find first clinic reference
    const clinicAsset = assets.find(
      (asset) =>
        asset.reference_type?.toLowerCase() === "clinic"
    );

    if (clinicAsset?.reference_id) {

      try {

        const clinicResponse = await axios.get(
          `${process.env.DENTAL_SERVICE_URL}/clinic/getclinic_microservice/${clinicAsset.reference_id}/${clinicAsset.tenant_id}`,
          {
            headers: {
              tenant_id,
              "x-realm": "dental",
            },
          }
        );

        const fullClinicData =
          clinicResponse?.data || null;

        if (fullClinicData) {

          clinicData = {
            clinic_id: fullClinicData.clinic_id,

            clinic_name:
              fullClinicData.clinic_name,

            clinic_logo:
              fullClinicData.clinic_logo,

            address:
              fullClinicData.address &&
              helper.safeJsonParse(
                fullClinicData.address
              ),

            city: fullClinicData.city,

            state: fullClinicData.state,

            pin_code:
              fullClinicData.pin_code,

            country:
              fullClinicData.country,

            email:
              fullClinicData.email,

            phone_number:
              fullClinicData.phone_number,

            website:
              fullClinicData.website || null,
          };
        }

      } catch (clinicError) {

        console.error(
          "Error fetching clinic data:",
          clinicError.message
        );

        clinicData = null;
      }
    }

    const convertedRows = assets.map(
      (assetAllocation) => ({
        ...assetAllocation,

        next_service_date: formatDateOnly(
          assetAllocation.next_service_date
        ),

        insurance_end_date: formatDateOnly(
          assetAllocation.insurance_end_date
        ),

        purchased_date: formatDateOnly(
          assetAllocation.purchased_date
        ),

        expired_date: formatDateOnly(
          assetAllocation.expired_date
        ),

        allocation_date: formatDateOnly(
          assetAllocation.allocation_date
        ),

        expected_return_date: formatDateOnly(
          assetAllocation.expected_return_date
        ),

        actual_return_date: formatDateOnly(
          assetAllocation.actual_return_date
        ),

        description:
          assetAllocation.description &&
          helper.safeJsonParse(
            assetAllocation.description
          ),

        remarks:
          assetAllocation.remarks &&
          helper.safeJsonParse(
            assetAllocation.remarks
          ),

        asset_allocation_comments:
          assetAllocation.asset_allocation_comments &&
          helper.safeJsonParse(
            assetAllocation.asset_allocation_comments
          ),
      })
    );

    return {
      clinic: clinicData,
      data: convertedRows,
    };

  } catch (error) {

    console.error(
      "Database error while fetching assets:",
      error
    );

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

        // Fetch asset_images documents
        const imageDocs = await getDocumentsByField(
          "asset",
          asset.asset_id,
          "asset_images"
        );

        const asset_images = imageDocs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          asset_images,
        };
      })
    );

    return { data: convertedRows, total: assets.total };
  } catch (error) {
    console.error("Database error while fetching assets:", error);
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
const updateAsset = async (assetId, data, tenant_id, req) => {
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

    const asset_images = data.asset_images || req?.body?.asset_images || [];

    if (data?.asset_images) {
      await updateDocumentsDiffBased({
        table_name: "asset",
        table_id: assetId,
        field_name: "asset_images",
        newFiles: asset_images,
        deletedFileIds: data.deletedFileIds,
        created_by: data.created_by,
        updated_by: data.updated_by,
        descriptions: data.descriptions,
      });
    }

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
    const affectedRows = await assetModel.deleteAssetByTenantAndAssetId(
      tenantId,
      assetId
    );
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
      console.error("Database error while fetching assets:", error);
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
    console.error("Database error while fetching assets:", error);
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
