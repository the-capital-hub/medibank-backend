"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
    if (token) {
        try {
            const payload = (0, jwt_1.verifyToken)(token);
            req.user = payload.userId; // TypeScript now recognizes `req.user`
        }
        catch (err) {
            req.user = null;
        }
    }
    else {
        req.user = null;
    }
    next();
};
exports.authMiddleware = authMiddleware;
