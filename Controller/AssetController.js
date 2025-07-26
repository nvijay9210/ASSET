const { CustomError } = require("../Middleware/CustomeError");
const { checkIfExists } = require("../Model/checkIfExists");
const assetService = require("../Service/AssetService");
const { isValidDate } = require("../Utils/DateUtils");
const assetValidation = require("../Validation/AssetValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../Validation/CommonValidations");

/**
 * Create a new asset
 */
exports.createAsset = async (req, res, next) => {
  const details = req.body;
  console.log(details)

  try {
    // Validate asset data
    await assetValidation.createAssetValidation(details);

    // Create the asset
    const id = await assetService.createAsset(details);
    res.status(201).json({ message: "Asset created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all assets by tenant ID with pagination
 */
exports.getAllAssetsByTenantId = async (req, res, next) => {
  const { tenant_id, page, limit } = req.query; 

  try {

    const assets = await assetService.getAllAssetsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(assets);
  } catch (err) {
    next(err);
  }
};

exports.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId = async (
  req,
  res,
  next
) => {
  const { tenant_id, reference_type, reference_id, page, limit } = req.query;
  
  try {
    const assets =
      await assetService.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId(
        tenant_id,
        reference_type,
        reference_id,
        page,
        limit
      );
    res.status(200).json(assets);
  } catch (err) {
    next(err);
  }
};

/**
 * Get asset by tenant and asset ID
 */
exports.getAssetByTenantIdAndAssetId = async (req, res, next) => {
  const { asset_id, tenant_id } = req.params;

  try {
    const asset1 = await checkIfExists(
      "asset",
      "asset_id",
      asset_id,
      tenant_id
    );
    if (!asset1) throw new CustomError("Asset not found", 404);

    // Fetch asset details
    const asset = await assetService.getAssetByTenantIdAndAssetId(
      tenant_id,
      asset_id
    );
    res.status(200).json(asset);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing asset
 */
exports.updateAsset = async (req, res, next) => {
  const { asset_id, tenant_id } = req.params;

  const details = req.body;


  try {
    // Validate update input
    await assetValidation.updateAssetValidation(asset_id, details);

    // Update the asset
    await assetService.updateAsset(asset_id, details, tenant_id);
    res.status(200).json({ message: "Asset updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a asset by ID and tenant ID
 */
exports.deleteAssetByTenantIdAndAssetId = async (req, res, next) => {
  const { asset_id, tenant_id } = req.params;

  try {
    // Validate if asset exists
    const asset1 = await checkIfExists(
      "asset",
      "asset_id",
      asset_id,
      tenant_id
    );
    if (!asset1) throw new CustomError("Asset not found", 404);

    // Delete the asset
    await assetService.deleteAssetByTenantIdAndAssetId(tenant_id, asset_id);
    res.status(200).json({ message: "Asset deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate =
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
      
      const assets =
        await assetService.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate(
          tenant_id,
          reference_type,
          reference_id,
          start_date,
          end_date,
          limit,
          page
        );
      res.status(200).json(assets);
    } catch (err) {
      next(err);
    }
  };
