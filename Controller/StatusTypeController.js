const { CustomError } = require("../Middleware/CustomeError");
const { checkIfExists } = require("../Model/checkIfExists");
const statusTypeService = require("../Service/StatusTypeService");
const statusTypeValidation = require("../Validation/StatusTypeValidation");

/**
 * Create a new statusType
 */
exports.createStatusType = async (req, res, next) => {
  const details = req.body;
 

  try {
    // Validate statusType data
    await statusTypeValidation.createStatusTypeValidation(details);

    // Create the statusType
    const id = await statusTypeService.createStatusType(details);
    res.status(200).json({ message: "StatusType created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all statusTypes by tenant ID with pagination
 */
exports.getAllStatusTypesByTenantId = async (req, res, next) => {

  try {
    const statusTypes = await statusTypeService.getAllStatusTypesByTenantId();
    res.status(200).json(statusTypes);
  } catch (err) {
    next(err);
  }
};

/**
 * Get statusType by tenant and statusType ID
 */
exports.getStatusTypeByStatusTypeId = async (req, res, next) => {
  const { statustype_id } = req.params;

  try {

    // Fetch statusType details
    const statusType = await statusTypeService.getStatusTypeByStatusTypeId( statustype_id);
    res.status(200).json(statusType);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing statusType
 */
exports.updateStatusType = async (req, res, next) => {
  const { statusType_id, tenant_id } = req.params;
  const details = req.body;

  try {

    // Validate update input
    await statusTypeValidation.updateStatusTypeValidation(statusType_id,details, tenant_id);

    // Update the statusType
    await statusTypeService.updateStatusType(statusType_id, details, tenant_id);
    res.status(200).json({ message: "StatusType updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an statusType by ID and tenant ID
 */
exports.deleteStatusTypeByTenantIdAndStatusTypeId = async (req, res, next) => {
  const { statusType_id, tenant_id } = req.params;

  try {
    // Validate if statusType exists
    const statusType=await checkIfExists('statusType','statusType_id',statusType_id,tenant_id);
    if(!statusType) throw new CustomError('StatusTypeId not Exists',404)

    // Delete the statusType
    await statusTypeService.deleteStatusTypeByTenantIdAndStatusTypeId(tenant_id, statusType_id);
    res.status(200).json({ message: "StatusType deleted successfully" });
  } catch (err) {
    next(err);
  }
}