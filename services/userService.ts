import prisma from "../models/prismaClient";
import redis from "../redis/redisClient";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { UserMaster } from "@prisma/client";

// Utility to handle BigInt serialization in JSON
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

// Restore BigInt values from JSON-parsed objects
function restoreBigInt(obj: any): any {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (typeof obj[key] === "string" && /^\d+$/.test(obj[key])) {
        obj[key] = BigInt(obj[key]);
      }
    }
  }
  return obj;
}

export const userService = {
  /**
   * Registers a new user and caches their data in Redis.
   */
  async registerUser(
    {
      EmailID,
      Password,
      FirstName,
      LastName,
      MobileNo,
      UserType,
    }: Partial<UserMaster>,
    redisClient: any
  ) {
    if (!EmailID || !Password || !FirstName || !MobileNo || !UserType) {
      throw new Error("Missing required fields for user registration.");
    }

     // Check if the email is already registered
     const existingUser = await prisma.userMaster.findUnique({
      where: { EmailID },
    });

    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }

    const hashedPassword = await hashPassword(Password);

    const user = await prisma.userMaster.create({
      data: {
        EmailID,
        Password: hashedPassword,
        FirstName,
        LastName,
        MobileNo,
        MBID: `MB${Math.random().toString().slice(2, 10)}`,
        UserType,
      },
    });

    const token = generateToken({ userId: user.ID.toString() });

    // Cache user data in Redis
    await redisClient.set(
      `user:${user.ID.toString()}`,
      safeStringify(user),
      "EX",
      3600
    );

    return { token, user };
  },

  /**
   * Logs in a user, validates credentials, and returns a JWT token.
   */
  async loginUser(
    { EmailID, Password }: { EmailID: string; Password: string },
    redisClient: any,
    res: any
  ) {
    if (!EmailID || !Password) {
      throw new Error("EmailID and Password are required.");
    }

    const cacheKey = `user:${EmailID}`;
    let user: UserMaster | null;

    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      user = restoreBigInt(JSON.parse(cachedUser)) as UserMaster;
    } else {
      user = await prisma.userMaster.findUnique({ where: { EmailID } });
      if (!user) {
        throw new Error("User not found.");
      }
      await redisClient.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
    }

    const isValid = await comparePassword(Password, user.Password);
    if (!isValid) {
      throw new Error("Invalid credentials.");
    }

    const token = generateToken({ userId: user.ID.toString() });
    res.cookie("token", token, { httpOnly: true });

    return { token, user };
  },

  /**
   * Retrieves a user by their ID, using Redis for caching.
   */
  async getUserById(userId: string) {
    const cacheKey = `user:${userId}`;
    let user: UserMaster | null;

    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      user = restoreBigInt(JSON.parse(cachedUser)) as UserMaster;
    } else {
      user = await prisma.userMaster.findUnique({ where: { ID: BigInt(userId) } });
      if (user) {
        await redis.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
      }
    }

    return user;
  },
};
