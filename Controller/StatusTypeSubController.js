const { CustomError } = require("../Middleware/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../Model/checkIfExists");
const statusTypeSubService = require("../Service/StatusTypeSubService");
const { validateTenantIdAndPageAndLimit } = require("../Validation/CommonValidations");
const statusTypeSubValidation = require("../Validation/StatusTypeSubValidation");

/**
 * Create a new statusTypeSub
 */
exports.createStatusTypeSub = async (req, res, next) => {
  const details = req.body;

  const { status_type } = req.params;

  try {
    // Validate statusTypeSub data
    await statusTypeSubValidation.createStatusTypeSubValidation(
      details,
      status_type
    );

    // Create the statusTypeSub
    const id = await statusTypeSubService.createStatusTypeSub(
      details,
      status_type
    );
    res.status(201).json({ message: "StatusTypeSub created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all statusTypeSubs by tenant ID with pagination
 */
exports.getAllStatusTypeSubsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const statusTypeSubs =
      await statusTypeSubService.getAllStatusTypeSubsByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json({statusTypeSubs,total:statusTypeSubs.length,page});
  } catch (err) {
    next(err);
  }
};

exports.getAllStatusTypeSubByTenantIdAndStatusTypeId = async (
  req,
  res,
  next
) => {
  const { tenant_id, status_type_id } = req.params;
  const { page, limit } = req.query;

  const statusType = await checkIfExists(
    "statustype",
    "status_type_id",
    status_type_id,
    tenant_id
  );

  if (!statusType) throw new CustomError("Statustype not found", 404);

  try {
    const statusTypeSubs =
      await statusTypeSubService.getAllStatusTypeSubByTenantIdAndStatusTypeId(
        tenant_id,
        status_type_id,
        page,
        limit
      );
      res.status(200).json({statusTypeSubs,total:statusTypeSubs.length,page});
  } catch (err) {
    next(err);
  }
};

exports.getAllStatusTypeSubByTenantIdAndStatusType = async (req, res, next) => {
  const { tenant_id, status_type } = req.params;
  const { page, limit } = req.query;

  const statusType = await checkIfIdExists(
    "statustype",
    "status_type",
    status_type
  );

  if (!statusType) throw new CustomError("Statustype not found", 404);

  try {
    const statusTypeSubs =
      await statusTypeSubService.getAllStatusTypeSubByTenantIdAndStatusType(
        tenant_id,
        status_type,
        page,
        limit
      );
      res.status(200).json({statusTypeSubs,total:statusTypeSubs.length,page});
  } catch (err) {
    next(err);
  }
};

/**
 * Get statusTypeSub by tenant and statusTypeSub ID
 */
exports.getStatusTypeSubByTenantIdAndStatusTypeSubId = async (
  req,
  res,
  next
) => {
  const { status_type_sub_id, tenant_id } = req.params;

  const statusType = await checkIfExists(
    "statustypesub",
    "status_type_sub_id",
    status_type_sub_id,
    tenant_id
  );

  if (!statusType) throw new CustomError("Statustypesubject not found", 404);

  try {
    // Fetch statusTypeSub details
    const statusTypeSub =
      await statusTypeSubService.getStatusTypeSubByTenantIdAndStatusTypeSubId(
        tenant_id,
        status_type_sub_id
      );
    res.status(200).json(statusTypeSub);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing statusTypeSub
 */
exports.updateStatusTypeSub = async (req, res, next) => {
  const { status_type_sub_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await statusTypeSubValidation.updateStatusTypeSubValidation(
      status_type_sub_id,
      details,
      tenant_id
    );

    // Update the statusTypeSub
    await statusTypeSubService.updateStatusTypeSub(
      status_type_sub_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "StatusTypeSub updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an statusTypeSub by ID and tenant ID
 */
exports.deleteStatusTypeSubByTenantIdAndStatusTypeSubId = async (
  req,
  res,
  next
) => {
  const { status_type_sub_id, tenant_id } = req.params;

  try {
    // Validate if statusTypeSub exists
    const statusTypeSub = await checkIfExists(
      "statustypesub",
      "status_type_sub_id",
      status_type_sub_id,
      tenant_id
    );
    if (!statusTypeSub)
      throw new CustomError("StatusTypeSubId not Exists", 404);

    // Delete the statusTypeSub
    await statusTypeSubService.deleteStatusTypeSubByTenantIdAndStatusTypeSubId(
      tenant_id,
      status_type_sub_id
    );
    res.status(200).json({ message: "StatusTypeSub deleted successfully" });
  } catch (err) {
    next(err);
  }
};
