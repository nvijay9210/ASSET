const Joi = require("joi");

exports.validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: error.details.map(e => e.message) });
    }
    next();
  };
};

exports.validateParams = (keys) => {
  return (req, res, next) => {
    for (let key of keys) {
      if (!req.params[key]) {
        return res.status(400).json({ error: `${key} is required in params` });
      }
    }
    next();
  };
};

exports.validateQuery = (keys) => {
  return (req, res, next) => {
    for (let key of keys) {
      if (!req.query[key]) {
        return res.status(400).json({ error: `${key} is required in query` });
      }
    }
    next();
  };
};
