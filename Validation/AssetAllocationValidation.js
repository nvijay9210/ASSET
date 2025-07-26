const { CustomError } = require("../Middleware/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../Model/checkIfExists");

const asset_allocationColumnConfig = [
  { columnname: "tenant_id", type: "int", null: false },
  { columnname: "asset_id", type: "int", null: false },
  { columnname: "reference_type", type: "varchar", size: 50, null: false },
  { columnname: "reference_id", type: "varchar", size: 100, null: false },
  { columnname: "allocated_to", type: "varchar", size: 100, null: true },
  { columnname: "allocated_by", type: "varchar", size: 100, null: true },
  { columnname: "allocation_date", type: "date", null: true },
  { columnname: "expected_return_date", type: "date", null: true },
  { columnname: "actual_return_date", type: "date", null: true },
  { columnname: "status", type: "varchar", size: 50, null: true },
  { columnname: "remarks", type: "text", null: true },
];


// AssetAllocation Column Configuration for Validation
const createColumnConfig = [
  ...asset_allocationColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...asset_allocationColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create AssetAllocation Input with Tenant Scope
 */
const createAssetAllocationValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfExists("clinic", "clinic_id", details.clinic_id, details.tenant_id),
  ]);
};

/**
 * Validate Update AssetAllocation Input with Tenant Scope
 */
const updateAssetAllocationValidation = async (assetId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "asset",
    "asset_id",
    assetId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("AssetAllocation not found", 404);
  }
};

module.exports = {
  createAssetAllocationValidation,
  updateAssetAllocationValidation,
};

