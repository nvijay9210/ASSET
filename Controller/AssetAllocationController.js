const { CustomError } = require("../Middleware/CustomeError");
const { checkIfExists } = require("../Model/checkIfExists");
const assetAllocationService = require("../Service/AssetAllocationService");
const { isValidDate } = require("../Utils/DateUtils");
const assetAllocationValidation = require("../Validation/AssetAllocationValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../Validation/CommonValidations");

/**
 * Create a new assetAllocation
 */
exports.createAssetAllocation = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate assetAllocation data
    await assetAllocationValidation.createAssetAllocationValidation(details);

    // Create the assetAllocation
    const id = await assetAllocationService.createAssetAllocation(details);
    res.status(201).json({ message: "AssetAllocation created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all assetAllocations by tenant ID with pagination
 */
exports.getAllAssetAllocationsByTenantId = async (req, res, next) => {
  const { tenant_id, page, limit } = req.query;

  if (!tenant_id) throw new CustomError("tenant Required Fields", 400);

  try {

    const assetAllocations = await assetAllocationService.getAllAssetAllocationsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(assetAllocations);
  } catch (err) {
    next(err);
  }
};

exports.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId = async (
  req,
  res,
  next
) => {
  const { tenant_id, reference_type, reference_id, page, limit } = req.query;
  if (!tenant_id || !reference_type || !reference_id)
    throw new CustomError(
      "Tenantid and Referencetype and ReferenceId is Required Fields",
      400
    );
  
  try {
    const assetAllocations =
      await assetAllocationService.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId(
        tenant_id,
        reference_type,
        reference_id,
        page,
        limit
      );
    res.status(200).json(assetAllocations);
  } catch (err) {
    next(err);
  }
};

/**
 * Get assetAllocation by tenant and assetAllocation ID
 */
exports.getAssetAllocationByTenantIdAndAssetAllocationId = async (req, res, next) => {
  const { assetAllocation_id, tenant_id } = req.params;
  
  try {
    const assetAllocation1 = await checkIfExists(
      "asset_allocation",
      "asset_allocation_id",
      assetAllocation_id,
      tenant_id
    );
    if (!assetAllocation1) throw new CustomError("AssetAllocation not found", 404);

    // Fetch assetAllocation details
    const assetAllocation = await assetAllocationService.getAssetAllocationByTenantIdAndAssetAllocationId(
      tenant_id,
      assetAllocation_id
    );
    res.status(200).json(assetAllocation);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing assetAllocation
 */
exports.updateAssetAllocation = async (req, res, next) => {
  const { assetAllocation_id, tenant_id } = req.params;

  const details = req.body;

  if (!tenant_id || !assetAllocation_id)
    throw new CustomError("Tenantid and AssetAllocationid Required Fields", 400);

  try {
    // Validate update input
    await assetAllocationValidation.updateAssetAllocationValidation(assetAllocation_id, details);

    // Update the assetAllocation
    await assetAllocationService.updateAssetAllocation(assetAllocation_id, details, tenant_id);
    res.status(200).json({ message: "AssetAllocation updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a assetAllocation by ID and tenant ID
 */
exports.deleteAssetAllocationByTenantIdAndAssetAllocationId = async (req, res, next) => {
  const { assetAllocation_id, tenant_id } = req.params;

  if (!tenant_id || !assetAllocation_id)
    throw new CustomError("Tenantid and AssetAllocationid Required Fields", 400);

  try {
    // Validate if assetAllocation exists
    const assetAllocation1 = await checkIfExists(
      "asset_allocation",
      "asset_allocation_id",
      assetAllocation_id,
      tenant_id
    );
    if (!assetAllocation1) throw new CustomError("AssetAllocation not found", 404);

    // Delete the assetAllocation
    await assetAllocationService.deleteAssetAllocationByTenantIdAndAssetAllocationId(tenant_id, assetAllocation_id);
    res.status(200).json({ message: "AssetAllocation deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate =
  async (req, res, next) => {
    const {
      tenant_id,
      reference_type,
      reference_id,
      start_date,
      end_date,
      limit,
      page,
    } = req.query;
    try {
      if (!(isValidDate(start_date) && isValidDate(end_date)))
        throw new CustomError("Startdate or enddate format invalid", 400);
      if (!page || !limit)
        throw new CustomError("Page and limit is required", 400);
      const assetAllocations =
        await assetAllocationService.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate(
          tenant_id,
          reference_type,
          reference_id,
          start_date,
          end_date,
          limit,
          page
        );
      res.status(200).json(assetAllocations);
    } catch (err) {
      next(err);
    }
  };
