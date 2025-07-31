const { CustomError } = require("../Middleware/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../Model/checkIfExists");

const assetColumnConfig = [
  { columnname: "tenant_id", type: "int", null: false },
  { columnname: "source_app", type: "varchar", size: 50, null: false },
  { columnname: "reference_type", type: "varchar", size: 50, null: false },
  { columnname: "reference_id", type: "varchar", size: 100, null: false },

  { columnname: "asset_code", type: "varchar", size: 50, null: true },
  { columnname: "serial_number", type: "varchar", size: 100, null: true },
  { columnname: "model_number", type: "varchar", size: 100, null: true },
  { columnname: "asset_name", type: "varchar", size: 100, null: false },
  { columnname: "asset_type", type: "varchar", size: 50, null: true },
  { columnname: "category", type: "varchar", size: 50, null: true },
  { columnname: "manufacturer", type: "varchar", size: 50, null: true },
  { columnname: "asset_status", type: "varchar", size: 50, null: true },
  { columnname: "asset_condition", type: "varchar", size: 50, null: true },
  { columnname: "quantity", type: "int", null: true },
  { columnname: "price", type: "decimal", size: "10,2", null: true },

  { columnname: "asset_photo", type: "varchar", size: 255, null: true },
  { columnname: "asset_images", type: "text", null: true },

  { columnname: "year_of_manufacturing", type: "year", null: true },
  { columnname: "appreciation_type", type: "enum", values: ["appreciating", "depreciating"], null: true },
  { columnname: "next_service_date", type: "date", null: true },
  { columnname: "colour", type: "varchar", size: 50, null: true },
  { columnname: "contact_name_number", type: "varchar", size: 150, null: true },
  { columnname: "insurance_number", type: "varchar", size: 100, null: true },
  { columnname: "insurance_end_date", type: "date", null: true },

  { columnname: "description", type: "text", null: true },
  { columnname: "allocated_to", type: "varchar", size: 100, null: true },

  { columnname: "purchased_date", type: "date", null: true },
  { columnname: "purchased_by", type: "varchar", size: 50, null: true },
  { columnname: "vendor_name", type: "varchar", size: 100, null: true },
  { columnname: "warranty_expiry", type: "date", null: true },
  { columnname: "expired_date", type: "date", null: true },
  { columnname: "invoice_number", type: "varchar", size: 50, null: true },
  { columnname: "location", type: "varchar", size: 100, null: true },
  { columnname: "remarks", type: "text", null: true },
];


// Asset Column Configuration for Validation
const createColumnConfig = [
  ...assetColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...assetColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create Asset Input with Tenant Scope
 */
const createAssetValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfExists("clinic", "clinic_id", details.clinic_id, details.tenant_id),
  ]);
};

/**
 * Validate Update Asset Input with Tenant Scope
 */
const updateAssetValidation = async (assetId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "asset",
    "asset_id",
    assetId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Asset not found", 404);
  }
};

module.exports = {
  createAssetValidation,
  updateAssetValidation,
};

