const Joi = require("joi");

// Base schema (common fields for create and update)
const baseAssetAllocationSchema = Joi.object({
  tenant_id: Joi.number().integer().required(),
  clinic_id: Joi.number().integer().required(),

  asset_id: Joi.number().integer().required(),
  allocation_type: Joi.string().max(50).required(), // e.g., "assigned", "returned"

  allocated_to: Joi.string().max(100).required(), // user/employee id or name
  allocation_date: Joi.date().iso().required(),
  deallocation_date: Joi.date().iso().allow(null),

  remarks: Joi.string().allow('', null),
});

// Create schema
const createAssetAllocationSchema = baseAssetAllocationSchema.keys({
  created_by: Joi.string().max(100).required(),
});

// Update schema
const updateAssetAllocationSchema = baseAssetAllocationSchema.keys({
  updated_by: Joi.string().max(100).required(),
});

module.exports = {
  createAssetAllocationSchema,
  updateAssetAllocationSchema,
};
