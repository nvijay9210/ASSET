const { CustomError } = require("../Middleware/CustomeError");
const { checkIfIdExists } = require("../Model/checkIfExists");

const validateTenantIdAndPageAndLimit = async (tenantId, page,limit) => {

    await checkIfIdExists('tenant','tenant_id',tenantId)
      if(isNaN(page) || isNaN(limit)) throw new CustomError('Page and limit must be number',400)
  };

  module.exports={validateTenantIdAndPageAndLimit}