const express = require("express");
const router = express.Router();
const assetAllocationController = require("../Controller/AssetAllocationController");
const {
  validateParams,
  validateQuery,
  validateBody,
} = require("../Middleware/ValidateFilters");
const assetAllocationValidationSchema = require("../Validation/AssetAllocationValidation");

router.post(
  "/addassetAllocation",
  validateBody(assetAllocationValidationSchema.createAssetAllocationSchema),
  assetAllocationController.createAssetAllocation
);

router.get(
  "/getallassetAllocations",
  validateQuery(["tenant_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantId
);
router.get(
  "/getallassetAllocationsbyreference",
  validateQuery(["tenant_id", "reference_type","reference_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId
);
router.get(
  "/getassetAllocationbytenant/:assetAllocation_id/:tenant_id",
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.getAssetAllocationByTenantIdAndAssetAllocationId
);

router.put(
  "/updateassetAllocation/:assetAllocation_id/:tenant_id",
  validateParams(["assetAllocation_id", "tenant_id"]),
  validateBody(assetAllocationValidationSchema.updateAssetAllocationSchema),
  assetAllocationController.updateAssetAllocation
);
router.delete(
  "/deleteassetAllocation/:assetAllocation_id/:tenant_id",
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.deleteAssetAllocationByTenantIdAndAssetAllocationId
);

router.get(
  "/getallassetAllocationsreportbyreference",
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate
); // Add validation if needed

module.exports = router;
