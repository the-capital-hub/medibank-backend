import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Request, Response } from "express";

export interface Context {
  prisma: PrismaClient;
  redis: Redis;
  req: Request & { user?: string };
  res: Response;
}
