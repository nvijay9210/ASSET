const express = require("express");
const router = express.Router();
const assetController = require("../Controller/AssetController");
const {
  validateParams,
  validateQuery,
  validateBody,
} = require("../Middleware/ValidateFilters");
const assetValidationSchema = require("../Validation/AssetValidation");

router.post(
  "/addasset",
  validateBody(assetValidationSchema.createAssetSchema),
  assetController.createAsset
);

router.get(
  "/getallassets",
  validateQuery(["tenant_id"]),
  assetController.getAllAssetsByTenantId
);
router.get(
  "/getallassetsbyreference",
  validateQuery(["tenant_id", "clinic_id"]),
  assetController.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId
);
router.get(
  "/getassetbytenant/:asset_id/:tenant_id",
  validateParams(["asset_id", "tenant_id"]),
  assetController.getAssetByTenantIdAndAssetId
);

router.put(
  "/updateasset/:asset_id/:tenant_id",
  validateParams(["asset_id", "tenant_id"]),
  validateBody(assetValidationSchema.updateAssetSchema),
  assetController.updateAsset
);
router.delete(
  "/deleteasset/:asset_id/:tenant_id",
  validateParams(["asset_id", "tenant_id"]),
  assetController.deleteAssetByTenantIdAndAssetId
);

router.get(
  "/getallassetsreportbyreference",
  assetController.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate
); // Add validation if needed

module.exports = router;
