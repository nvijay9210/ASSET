const express = require("express");
const router = express.Router();

const assetAllocationController = require("../Controller/AssetAllocationController");
const assetAllocationValidationSchema = require("../Validation/AssetAllocationValidation");
const {
  authenticateTenantClinicGroup,
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
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  assetAllocationController.createAssetAllocation
);

// Get All Allocations by Tenant
router.get(
  "/getallassetallocations",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateQuery(["tenant_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantId
);

// Get Allocations by Reference
router.get(
  "/getallassetallocationsbyreference",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateQuery(["tenant_id", "reference_type", "reference_id"]),
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceId
);

// Get Allocation by ID
router.get(
  "/getassetallocationbytenant/:assetAllocation_id/:tenant_id",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.getAssetAllocationByTenantIdAndAssetAllocationId
);

// Update Allocation
router.put(
  "/updateassetallocation/:assetAllocation_id/:tenant_id",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.updateAssetAllocation
);

// Delete Allocation
router.delete(
  "/deleteassetallocation/:assetAllocation_id/:tenant_id",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateParams(["assetAllocation_id", "tenant_id"]),
  assetAllocationController.deleteAssetAllocationByTenantIdAndAssetAllocationId
);

// Report by Date + Reference
router.get(
  "/getallassetallocationsreportbyreference",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateQuery([
    "tenant_id",
    "reference_type",
    "reference_id",
    "start_date",
    "end_date",
  ]),
  assetAllocationController.getAllAssetAllocationsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate
);

module.exports = router;
