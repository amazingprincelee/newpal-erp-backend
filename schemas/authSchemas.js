import * as yup from "yup";

// Allowed roles based on your Mongoose Schema
const allowedRoles = [
  "super-admin",
  "admin",
  "gate",
  "security",
  "weighbridge",
  "inventory",
  "procurement",
  "sales",
  "dispatch",
  "production",
  "qa",
  "lab",
  "finance"
];

// REGISTER VALIDATION
export const registerSchema = yup.object({
  body: yup.object({
    fullname: yup.string().required("Full name is required"),
    
    username: yup
      .string()
      .required("Username is required")
      .min(6, "Username must be at least 6 characters")
      .max(20, "Username must not exceed 20 characters")
      .matches(
        /^[a-z0-9_.-]+$/,
        "Username can only contain lowercase letters, numbers, underscores, dots, and hyphens"
      )
      .matches(
        /^[a-z0-9]/,
        "Username must start with a letter or number"
      )
      .matches(
        /[a-z0-9]$/,
        "Username must end with a letter or number"
      )
      .test(
        'no-spaces',
        'Username cannot contain spaces',
        value => !value || !value.includes(' ')
      ),

    email: yup
      .string()
      .email("Enter a valid email address")
      .nullable(),

    phone: yup
      .string()
      .required("Phone number is required")
      .matches(/^[0-9]+$/, "Phone must contain only numbers")
      .min(10, "Phone number is too short")
      .max(15, "Phone number is too long"),

    address: yup.string().required("Address is required"),

    gender: yup
      .string()
      .oneOf(["female", "male", "other"], "Invalid gender"),

    role: yup
      .string()
      .required("Role is required")
      .oneOf(allowedRoles, "Invalid role selected"),

    password: yup
      .string()
      .required("Password is required")
      .min(6, "Password must be at least 6 characters"),
  }),
});

// LOGIN VALIDATION
export const loginSchema = yup.object({
  body: yup.object({
    username: yup.string().required("Username is required"),

    password: yup.string().required("Password is required"),
  }),
});
