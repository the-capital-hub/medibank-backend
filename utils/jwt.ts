import jwt from "jsonwebtoken";

export const generateToken = (payload: object): string =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });

export const verifyToken = (token: string): { userId: string } =>
  jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };