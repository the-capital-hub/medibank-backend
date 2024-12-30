import prisma from "../models/prismaClient";
import redis from "../redis/redisClient";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { UserMaster } from "@prisma/client";
import { otpService } from "./otpService";

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
   * Registers a new user by sending OTPs to email and mobile.
   * Temporarily stores user details in Redis until OTP verification.
   */
  async registerUser(
    { EmailID, Password, FirstName, LastName, MobileNo, UserType }: any,
    redisClient: any
  ) {
    if (!EmailID || !Password || !FirstName || !MobileNo || !UserType) {
      throw new Error("Missing required fields for user registration.");
    }
  
    // Check if the email is already registered
    const existingUser = await prisma.userMaster.findUnique({ where: { EmailID } });
    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }
  
    // Generate and send OTP
    await otpService.generateAndSendOtp(EmailID, MobileNo);
  
    // Temporarily store user details in Redis
    const userData = { EmailID, Password, FirstName, LastName, MobileNo, UserType };
    await redisClient.set(`user:temp:${EmailID}`, JSON.stringify(userData), "EX", 600); // Expire in 10 minutes
  
    return { message: "OTP sent to email and mobile. Please verify." };
  },

  /**
   * Verifies OTP and creates a new user in the database.
   */
  async verifyAndCreateUser(email: string, mobile: string, otp: string) {
    // Verify OTPs
    await otpService.verifyOtp(email, otp);
    await otpService.verifyOtp(mobile, otp);
  
    // Retrieve temporary user data from Redis
    const userDataJson = await redis.get(`user:temp:${email}`);
    if (!userDataJson) {
      throw new Error("User data expired. Please register again.");
    }
  
    const userData = JSON.parse(userDataJson);
    const hashedPassword = await hashPassword(userData.Password);
  
    // Create user in the database
    const user = await prisma.userMaster.create({
      data: {
        EmailID: userData.EmailID,
        Password: hashedPassword,
        FirstName: userData.FirstName,
        LastName: userData.LastName,
        MobileNo: userData.MobileNo,
        MBID: `MB${Math.random().toString().slice(2, 10)}`,
        UserType: userData.UserType,
      },
    });
  
    // Generate token
    const token = generateToken({ userId: user.ID.toString() });
  
    // Remove temporary user data from Redis
    await redis.del(`user:temp:${email}`);
  
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

    // Check Redis cache for user data
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      user = restoreBigInt(JSON.parse(cachedUser)) as UserMaster;
    } else {
      // Fetch user from the database if not cached
      user = await prisma.userMaster.findUnique({ where: { EmailID } });
      if (!user) {
        throw new Error("User not found.");
      }
      await redisClient.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
    }

    // Validate password
    const isValid = await comparePassword(Password, user.Password);
    if (!isValid) {
      throw new Error("Invalid credentials.");
    }

    // Generate and set token
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

    // Check Redis cache for user data
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      user = restoreBigInt(JSON.parse(cachedUser)) as UserMaster;
    } else {
      // Fetch user from the database if not cached
      user = await prisma.userMaster.findUnique({ where: { ID: BigInt(userId) } });
      if (user) {
        await redis.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
      }
    }

    return user;
  },
};
