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
  async registerUser(
    { EmailID, Password, fullname , mobile_num, UserType }: any,
    redisClient: any
  ) {
    if (!EmailID || !Password || !fullname || !mobile_num || !UserType) {
      throw new Error("Missing required fields for user registration.");
    }
  
    // Check if the email is already registered
    const existingUser = await prisma.userMaster.findUnique({ where: { EmailID } });
    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }
  
    // Generate and send OTP
    await otpService.generateAndSendOtp(EmailID, mobile_num);
  
    // Temporarily store user details in Redis
    const userData = { EmailID, Password, fullname , mobile_num, UserType };
    await redisClient.set(`user:temp:${EmailID}`, JSON.stringify(userData), "EX", 600); // Expire in 10 minutes
  
    return { message: "OTP sent to email and mobile. Please verify." };
  },

  // Verifies OTP and creates a new user in the database.

  async verifyAndCreateUser(email: string, mobile_num: string, otp: string) {
    
    await otpService.verifyOtp(email, otp);
    if (mobile_num) {
      await otpService.verifyOtp(mobile_num, otp);
    }

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
        fullname: userData.fullname,
        mobile_num: userData.mobile_num,
        MBID: `MB${Math.random().toString().slice(2, 10)}`,
        UserType: userData.UserType,
      },
    });

    const token = generateToken({ userId: user.ID.toString() });  // Convert BigInt to String

    if (!token) {
      throw new Error("Token generation failed.");
    }

    await redis.del(`user:temp:${email}`);

    // Convert BigInt fields to strings before returning
    return {
      token,
      user: {
        ...user,
        ID: user.ID.toString()  // Convert BigInt to String
      }
    };
  },


  //Logs in a user, validates credentials, and returns a JWT token.
   
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
