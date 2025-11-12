const express = require("express");
const router = express.Router();

const assetAllocationController = require("../Controller/AssetAllocationController");
const assetAllocationValidationSchema = require("../Validation/AssetAllocationValidation");
const {
  validateKeycloakToken,
} = require("../Keycloak/AuthenticateTenantAndClient");

const {
  validateParams,
  validateQuery,
  validateBody,
} = require("../Middleware/ValidateFilters");

// ===================== ROUTES ===================== //

// Create Asset Allocation
router.post(
  "/addassetallocation",
  validateKeycloakToken(["tenant", "dentist", "superuser"]),
  assetAllocationController.createAssetAllocation
);

// Get All Allocations by Tenant
router.get(
  "/getallassetallocations",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateQuery(["tenant_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantId
);

// Get Allocations by Reference
router.get(
  "/getallassetallocationsbyreference",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateQuery(["tenant_id", "reference_type", "reference_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId
);

// Get Allocation by ID
router.get(
  "/getassetallocationbytenant/:assetAllocation_id/:tenant_id",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.getAssetAllocationByTenantIdAndAssetAllocationId
);

// Update Allocation
router.put(
  "/updateassetallocation/:assetAllocation_id/:tenant_id",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.updateAssetAllocation
);

// Delete Allocation
router.delete(
  "/deleteassetallocation/:assetAllocation_id/:tenant_id",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.deleteAssetAllocationByTenantIdAndAssetAllocationId
);

// Report by Date + Reference
router.get(
  "/getallassetallocationsreportbyreference",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateQuery([
    "tenant_id",
    "reference_type",
    "reference_id",
    "start_date",
    "end_date",
  ]),
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate
);
router.get(
  "/getallassetandassetallocationbytenantid",
  validateKeycloakToken(["tenant", "dentist", "superuser", "receptionist"]),
  validateQuery([
    "tenant_id"
  ]),
  assetAllocationController.getAllAssetAndAllocationsByTenantId
);

module.exports = router;
