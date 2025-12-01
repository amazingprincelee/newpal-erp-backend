import { registerSchema, loginSchema } from "../schemas/authSchemas.js"; 

// FUNCTION: Validate Register
export const registerValidator = async (req, res, next) => {
  try {
    await registerSchema.validate(
      { body: req.body },
      { abortEarly: false }
    );
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      errors: err.inner.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
};

// FUNCTION: Validate Login
export const loginValidator = async (req, res, next) => {
  try {
    await loginSchema.validate(
      { body: req.body },
      { abortEarly: false }
    );
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      errors: err.inner.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
};
