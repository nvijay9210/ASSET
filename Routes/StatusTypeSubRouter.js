const express = require("express");
const router = express.Router();

const statusTypeSubController = require("../Controller/StatusTypeSubController");
const {
  validateKeycloakToken,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create StatusTypeSub
router.post(
  "/addstatustypesub/:status_type",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  statusTypeSubController.createStatusTypeSub
);

// Get All StatusTypeSubs by Tenant ID with Pagination
router.get(
  "/getallstatustypesub/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  statusTypeSubController.getAllStatusTypeSubsByTenantId
);

// Get Single StatusTypeSub by Tenant ID & StatusTypeSub ID
router.get(
  "/getstatustypesub/:status_type_sub_id/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  statusTypeSubController.getStatusTypeSubByTenantIdAndStatusTypeSubId
);

router.get(
  "/getstatustypesub_statustypeid/:status_type_id/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier","guest"]),
  statusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusTypeId
);

router.get(
  "/getstatustypesub_statustype/:status_type/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier","guest"]),
  statusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusType
);

// Update StatusTypeSub
router.put(
  "/updatestatustypesub/:status_type_sub_id/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  statusTypeSubController.updateStatusTypeSub
);

// Delete StatusTypeSub
router.delete(
  "/deletestatustypesub/:status_type_sub_id/:tenant_id",
  validateKeycloakToken(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  statusTypeSubController.deleteStatusTypeSubByTenantIdAndStatusTypeSubId
);

module.exports = router;
