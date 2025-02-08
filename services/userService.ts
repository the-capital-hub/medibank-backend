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
    { EmailID, Password, fullname, mobile_num, city, state, date_of_birth, gender, sex, UserType }: any,
    redisClient: any
  ) {
    // Check for missing required fields
    if (!EmailID || !Password || !fullname || !mobile_num || !city || !state || !date_of_birth || !sex || !UserType) {
      throw new Error("Missing required fields for user registration.");
    }
  
    // Email validation regex pattern
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (EmailID && !emailRegex.test(EmailID)) {
      throw new Error("Invalid email format.");
    }
  
    // Mobile number validation
    const mobileRegex = /^\+91\d{10}$/;
    const isConsecutive = (str: string) => {
      const numArray = str.split('').map(Number);
      for (let i = 1; i < numArray.length; i++) {
        if (numArray[i] !== numArray[i - 1] + 1) {
          return false;
        }
      }
      return true;
    };
  
    const isRepeated = (str: string) => {
      return /^(\d)\1{9}$/.test(str); // checks for repeated digits like 1111111111
    };
  
    // Check if the mobile number format is valid
    if (mobile_num && !mobileRegex.test(mobile_num)) {
      throw new Error("Invalid mobile number format. It should be in the format +91xxxxxxxxxx.");
    }
  
    // Extract the numeric part of the mobile number (after +91)
    const mobileDigits = mobile_num.slice(3);
  
    // Check for repeated digits (e.g., +919999999999)
    if (isRepeated(mobileDigits)) {
      throw new Error("Mobile number cannot have repeated digits.");
    }
  
    // Check for consecutive digits (e.g., +919876543210)
    if (isConsecutive(mobileDigits)) {
      throw new Error("Mobile number cannot have consecutive digits.");
    }
  
// Append static timestamp to date_of_birth
const dateOfBirthWithTimestamp = `${date_of_birth}T12:00:00Z`;

    // Check if the email or mobile number is already registered
    const existingEmail = await prisma.userMaster.findUnique({ where: { EmailID } });
    if (existingEmail) {
      throw new Error("A user with this email already exists.");
    }
  
    const existingMobile = await prisma.userMaster.findUnique({ where: { mobile_num } });
    if (existingMobile) {
      throw new Error("A user with this mobile number already exists.");
    }
  
    // Generate and send OTP
    await otpService.generateAndSendOtp(EmailID, mobile_num);
  
    // Temporarily store user details in Redis
    const userData = { EmailID, Password, fullname, mobile_num, city, state,dateOfBirthWithTimestamp, gender, sex, UserType };
    await redisClient.set(`user:temp:${EmailID}`, JSON.stringify(userData), "EX", 600); // Expire in 10 minutes
  
    return { message: "OTP sent to email and mobile. Please verify." };
  },
  
  // Verifies OTP and creates a new user in the database.

  async verifyAndCreateUser(email: string, mobile_num: string, emailOtp: string, mobileOtp: string) {
    if (!mobileOtp|| mobileOtp.length !== 6 || mobileOtp===null ) {
      throw new Error("Please Enter a valid OTP");
    }
    await otpService.verifyMobileOtp(mobile_num, mobileOtp);

      // Validate email OTP
  if (emailOtp && emailOtp.length !== 6) {
    throw new Error("Please Enter a valid email OTP.");
  }

    // If email OTP is provided, verify it
  if (email && emailOtp) {
    await otpService.verifyEmailOtp(email, emailOtp);
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
        city: userData.city,
        state: userData.state,
        date_of_birth: userData.dateOfBirthWithTimestamp,
        sex: userData.sex,
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
    { identifier, Password }: { identifier: string; Password: string },
    res: any
  ) {
    if (!identifier || !Password) {
      throw new Error("Identifier (Email/Mobile) and Password are required.");
    }
  
    // Simple mobile number normalization - only add +91 to 10-digit numbers
    const normalizeMobileNumber = (number: string): string => {
      const digits = number.replace(/\D/g, '');
      return digits.length === 10 ? `+91${digits}` : number;
    };
  
    // Check if identifier is a 10-digit number
    const isMobile = /^\d{10}$/.test(identifier);
  
    const whereClause = isMobile 
      ? { mobile_num: normalizeMobileNumber(identifier) }
      : { EmailID: identifier };
  
    let user: UserMaster | null;
  
    // Fetch user directly from the database
    user = await prisma.userMaster.findUnique({ where: whereClause });
    if (!user) {
      throw new Error("User not found.");
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
