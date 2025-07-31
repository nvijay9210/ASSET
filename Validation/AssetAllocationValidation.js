const { CustomError } = require("../Middleware/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../Model/checkIfExists");
const { checkReferenceExists } = require("../Utils/ValidateReference");
const { getAssetByTenantAndAssetId } = require("../Model/AssetModel");

const asset_allocationColumnConfig = [
  { columnname: "tenant_id", type: "int", null: false },
  { columnname: "asset_id", type: "int", null: false },
  { columnname: "reference_type", type: "varchar", size: 50, null: false },
  { columnname: "reference_id", type: "varchar", size: 100, null: false },
  { columnname: "asset_allocation_quantity", type: "int", null: false },
  { columnname: "allocated_to", type: "varchar", size: 100, null: true },
  { columnname: "allocated_by", type: "varchar", size: 100, null: true },
  { columnname: "allocation_date", type: "date", null: true },
  { columnname: "expected_return_date", type: "date", null: true },
  { columnname: "actual_return_date", type: "date", null: true },
  { columnname: "status", type: "varchar", size: 50, null: true },
  { columnname: "remarks", type: "text", null: true },
  { columnname: "allocation_comments", type: "text", null: true },
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

  // Check if referenced entity exists (clinic/hospital/patient/etc)
  const referenceExists = await checkReferenceExists(
    details.reference_type,
    details.reference_id,
    details.tenant_id
  );
  if (!referenceExists) {
    throw new CustomError("ReferenceId does not exist", 400);
  }

  // Check if asset exists and has sufficient quantity
  const asset = await getAssetByTenantAndAssetId(
    details.asset_id,
    details.tenant_id
  );

  if (!asset) {
    throw new CustomError("Asset not found", 404);
  }

  if (Number(asset.quantity) < Number(details.asset_allocation_quantity)) {
    throw new CustomError(`Asset quantity is only ${asset.quantity}`, 400);
  }
};


/**
 * Validate Update AssetAllocation Input with Tenant Scope
 */
const updateAssetAllocationValidation = async (assetId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "asset_allocation",
    "asset_allocation_id",
    assetId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("AssetAllocation not found", 404);
  }

  // Optional: Check if reference_id is updated, and validate
  if (details.reference_type && details.reference_id) {
    const referenceExists = await checkReferenceExists(
      details.reference_type,
      details.reference_id,
      details.tenant_id
    );
    if (!referenceExists) {
      throw new CustomError("ReferenceId does not exist", 400);
    }
  }

  // Optional: If quantity or asset_id is being changed, revalidate quantity
  if (
    Object.prototype.hasOwnProperty.call(details, "asset_allocation_quantity") ||
    Object.prototype.hasOwnProperty.call(details, "asset_id")
  ) {
    const asset = await getAssetByTenantAndAssetId(
      details.asset_id,
      details.tenant_id
    );
    if (!asset) {
      throw new CustomError("Asset not found", 404);
    }

    if (
      Number(asset.quantity) < Number(details.asset_allocation_quantity)
    ) {
      throw new CustomError(
        `Asset quantity is only ${asset.quantity}`,
        400
      );
    }
  }
};


module.exports = {
  createAssetAllocationValidation,
  updateAssetAllocationValidation,
};

