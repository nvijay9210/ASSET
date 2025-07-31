const express = require("express");
const router = express.Router();
const multer = require("multer");

const assetController = require("../Controller/AssetController");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

const assetValidationSchema = require("../Validation/AssetValidation");
const {
  validateParams,
  validateQuery,
  validateBody,
} = require("../Middleware/ValidateFilters");

const { uploadFileMiddleware } = require("../Utils/UploadFiles");

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

const assetFileMiddleware = uploadFileMiddleware({
  folderName: "Asset",
  fileFields: [
    {
      fieldName: "asset_photo",
      maxSizeMB: 2,
      multiple: false,
    },
    {
      fieldName: "asset_images",  // Added for document uploads (optional)
      maxSizeMB: 10,
      multiple: true
    }
  ],
  createValidationFn: assetValidationSchema.createAssetValidation,
  updateValidationFn: assetValidationSchema.updateAssetValidation,
});

// ===================== ROUTES ===================== //

// Create Asset
router.post(
  "/createasset",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  upload.any(), // Use multer to handle file uploads
  assetFileMiddleware, // Call the file upload middleware
  assetController.createAsset
);

// Get All Assets by Tenant ID
router.get(
  "/getallassets",
  authenticateTenantClinicGroup([
    "tenant",
    "dentist",
    "super-user",
    "receptionist",
  ]),
  validateQuery(["tenant_id"]),
  assetController.getAllAssetsByTenantId
);

// Get All Assets by Tenant + Clinic + Reference
router.get(
  "/getallassetsbyreference",
  authenticateTenantClinicGroup([
    "tenant",
    "dentist",
    "super-user",
    "receptionist",
  ]),
  validateQuery(["tenant_id", "reference_type", "reference_id"]),
  assetController.getAllAssetsByTenantIdAndReferenceTypeAndReferenceId
);

// Get Asset by ID
router.get(
  "/getassetbytenant/:asset_id/:tenant_id",
  authenticateTenantClinicGroup([
    "tenant",
    "dentist",
    "super-user",
    "receptionist",
  ]),
  validateParams(["asset_id", "tenant_id"]),
  assetController.getAssetByTenantIdAndAssetId
);

// Update Asset
router.put(
  "/updateasset/:asset_id/:tenant_id",
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user", "receptionist"]),
  validateParams(["asset_id", "tenant_id"]),
  upload.any(), // Use multer to handle file uploads
  assetFileMiddleware, // Call the file upload middleware
  assetController.updateAsset
);

// Delete Asset
router.delete(
  "/deleteasset/:asset_id/:tenant_id",
  authenticateTenantClinicGroup([
    "tenant",
    "dentist",
    "super-user",
    "receptionist",
  ]),
  validateParams(["asset_id", "tenant_id"]),
  assetController.deleteAssetByTenantIdAndAssetId
);

// Asset Report by Date + Clinic
router.get(
  "/getassetreport",
  authenticateTenantClinicGroup([
    "tenant",
    "dentist",
    "super-user",
    "receptionist",
  ]),
  validateQuery([
    "tenant_id",
    "reference_type",
    "reference_id",
    "start_date",
    "end_date",
  ]),
  assetController.getAllAssetsByTenantIdAndReferenceTypeAndReferenceIdAndStartDateAndEndDate
);

module.exports = router;
