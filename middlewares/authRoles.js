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

// Check for Super Admin
export const isSales = (req, res, next) => {
    if (!req.user || req.user.role !== "sales") {
        return res.status(403).json({ message: "Access denied: Sales only" });
    }
    next();
};
// Check for Super Admin
export const isProcurement = (req, res, next) => {
    if (!req.user || req.user.role !== "procurement") {
        return res.status(403).json({ message: "Access denied: Procurement staff only" });
    }
    next();
};
