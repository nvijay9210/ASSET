const express = require("express");
const router = express.Router();

const statusTypeController = require("../Controller/StatusTypeController");

const {
  validateKeycloakToken,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create StatusType
router.post(
  '/addstatustype',
  validateKeycloakToken(["tenant", "superuser", "dentist", "patient"]),
  statusTypeController.createStatusType
);

// Get All StatusTypes by Tenant ID with Pagination
router.get(
  '/getallstatustype',
  validateKeycloakToken(["tenant", "superuser", "dentist", "patient"]),
  statusTypeController.getAllStatusTypesByTenantId
);

// Get Single StatusType by Tenant ID & StatusType ID
router.get(
  '/getstatustype/:statustype_id',
  validateKeycloakToken(["tenant", "superuser", "dentist", "patient"]),
  statusTypeController.getStatusTypeByStatusTypeId
);

// Update StatusType
router.put(
  '/updatestatustype/:statustype_id',
  validateKeycloakToken(["tenant", "superuser", "dentist", "patient"]),
  statusTypeController.updateStatusType
);

// Delete StatusType
router.delete(
  "/deletestatustype/:statustype_id",
  validateKeycloakToken(["tenant", "superuser", "dentist", "patient"]),
  statusTypeController.deleteStatusTypeByTenantIdAndStatusTypeId
);

module.exports = router;
