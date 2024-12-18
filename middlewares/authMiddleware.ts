import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
// import "../types/express";

declare global {
  namespace Express {
    interface Request {
      user?: string | null; // Add the `user` property to the Request object
    }
  }
}


export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload.userId; // TypeScript now recognizes `req.user`
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};
