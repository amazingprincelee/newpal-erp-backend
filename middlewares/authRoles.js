// Check for Super Admin
export const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied: Super Admin only" });
    }
    next();
};

// Check for Admin or Super Admin
export const isAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "super-admin")) {
        return res.status(403).json({ message: "Access denied: Admin only" });
    }
    next();
};
