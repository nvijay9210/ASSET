const { CustomError } = require("../Middleware/CustomeError");
const statusTypeSubModel = require("../Model/StatusTypeSubModel");
const { validateInput } = require("./InputValidation");
const {
  checkIfIdExists,
  checkIfExists
} = require("../Model/checkIfExists");
const { recordExists } = require("../Query/Records");
const statusTypeModel = require("../Model/StatusTypeModel");

const statusTypeSubColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "status_type_sub", type: "varchar", size: 100, null: false },
  {
    columnname: "status_type_sub_ref",
    type: "varchar",
    size: 100,
    null: false,
  },
];
const createColumnConfig = [
  ...statusTypeSubColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];
const updateColumnConfig = [
  ...statusTypeSubColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

// Create StatusTypeSub Validation
const createStatusTypeSubValidation = async (details, status_type) => {
  validateInput(details, createColumnConfig);

  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);

  const statusTypeId =
    await statusTypeModel.getStatusTypeIdByTenantAndStatusType(status_type);

  const statusTypeSub =
    await statusTypeSubModel.checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndTenantId(
      details.tenant_id,
      statusTypeId,
      details.status_type_sub
    );
  if (statusTypeSub)
    throw new CustomError("StatusTypeSubject Already Exists", 409);
};

// Update StatusTypeSub Validation
const updateStatusTypeSubValidation = async (
  statusTypeSubId,
  details,
  tenantId
) => {
  validateInput(details, updateColumnConfig);

  const idExists = await checkIfExists(
    "statustypesub",
    "status_type_sub_id",
    statusTypeSubId,
    tenantId
  );

  if (!idExists) throw new CustomError("statusTypeSubId not exists", 404);

  // const statusTypeSubExists=await statusTypeSubModel.checkStatusTypeSubExistsByStatusTypeSubIdAndStatusTypeIdAndStatusTypeSubAndTenantId(tenantId,details.status_type_id,statusTypeSubId,details.status_type_sub)
  // if(statusTypeSubExists) throw new CustomError('statusTypeSubject Already exists',409)

  const statusTypeSubRefExists =
    await statusTypeSubModel.checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId(
      tenantId,
      statusTypeSubId,
      details.status_type_sub,
      details.status_type_sub_ref
    );
  if (statusTypeSubRefExists)
    throw new CustomError("StatusTypeReference Already Exists", 409);
};

module.exports = {
  createStatusTypeSubValidation,
  updateStatusTypeSubValidation,
};
