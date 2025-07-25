const Joi = require("joi");

// Base schema (common fields for create and update)
const baseAssetAllocationSchema = Joi.object({
    asset_allocation_id: Joi.number().integer().allow(null),
    tenant_id: Joi.number().integer().required(),
    asset_id: Joi.number().integer().required(),
  
    reference_type: Joi.string().max(100).required(),
    reference_id: Joi.string().max(100).required(),
  
    allocated_to: Joi.string().max(100).required(),
    allocated_by: Joi.string().max(100).required(),
  
    allocation_date: Joi.date().iso().required(),
    expected_return_date: Joi.date().iso().optional().allow(null),
    actual_return_date: Joi.date().iso().optional().allow(null),
  
    status: Joi.string().max(100).optional(), // example values
    remarks: Joi.string().allow("", null),
});

const validateCreateAssetAllocation = async (data) => {
  return await createAssetAllocationSchema.validateAsync(data, {
    abortEarly: false,
  });
};

const validateUpdateAssetAllocation = async (data) => {
  return await updateAssetAllocationSchema.validateAsync(data, {
    abortEarly: false,
  });
};

// Create schema
const createAssetAllocationSchema = baseAssetAllocationSchema.keys({
  created_by: Joi.string().max(100).required(),
});

// Update schema
const updateAssetAllocationSchema = baseAssetAllocationSchema.keys({
  updated_by: Joi.string().max(100).required(),
});

module.exports = {
  validateCreateAssetAllocation,
  validateUpdateAssetAllocation,
  createAssetAllocationSchema,
  updateAssetAllocationSchema,
};
