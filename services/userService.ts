import prisma from "../models/prismaClient";
import redis from "../redis/redisClient";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { UserMaster } from "@prisma/client";
import { otpService } from "./otpService";
import { doctorService } from "./doctorService";

// Enhanced utility to handle BigInt serialization in JSON
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

// Enhanced restore function for BigInt values
function restoreBigInt(obj: any): any {
  if (!obj) return obj;
  
  if (typeof obj === "object") {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === "string" && /^\d+$/.test(value)) {
        obj[key] = BigInt(value);
      } else if (typeof value === "object") {
        obj[key] = restoreBigInt(value);
      }
    });
  }
  return obj;
}

// Utility to sanitize user object for response
function sanitizeUserForResponse(user: UserMaster | null): any {
  if (!user) return null;
  
  const sanitizedUser = {
    ...user,
    ID: user.ID.toString() // Ensure ID is always a string
  };

  return sanitizedUser;
}

export const userService = {
  async registerUser(
    { EmailID, Password, fullname, mobile_num, city, state, date_of_birth, gender, sex, UserType, licenseRegistrationNo, qualifications, collegeName, courseYear }: any,
    redisClient: any
  ) {
    // Validation checks remain the same...
    if (!EmailID || !Password || !fullname || !mobile_num || !city || !state || !date_of_birth || !sex || !UserType) {
      throw new Error("Missing required fields for user registration.");
    }
  
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (EmailID && !emailRegex.test(EmailID)) {
      throw new Error("Invalid email format.");
    }
  
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
      return /^(\d)\1{9}$/.test(str);
    };
  
    if (mobile_num && !mobileRegex.test(mobile_num)) {
      throw new Error("Invalid mobile number format. It should be in the format +91xxxxxxxxxx.");
    }
  
    const mobileDigits = mobile_num.slice(3);
  
    if (isRepeated(mobileDigits)) {
      throw new Error("Mobile number cannot have repeated digits.");
    }
  
    if (isConsecutive(mobileDigits)) {
      throw new Error("Mobile number cannot have consecutive digits.");
    }
  
    const dateOfBirthWithTimestamp = `${date_of_birth}T12:00:00Z`;

    const existingEmail = await prisma.userMaster.findUnique({ where: { EmailID } });
    if (existingEmail) {
      throw new Error("A user with this email already exists.");
    }
  
    const existingMobile = await prisma.userMaster.findUnique({ where: { mobile_num } });
    if (existingMobile) {
      throw new Error("A user with this mobile number already exists.");
    }
  
    await otpService.generateAndSendOtp(EmailID, mobile_num);
  
    const userData = { EmailID, Password, fullname, mobile_num, city, state, dateOfBirthWithTimestamp, gender, sex, UserType };
    await redisClient.set(`user:temp:${EmailID}`, safeStringify(userData), "EX", 600);

    if (UserType === "doctor") {
      const doctorData = { 
        licenseRegistrationNo, 
        qualifications, 
        collegeName, 
        courseYear 
      };
      await redisClient.set(`doctor:temp:${EmailID}`, safeStringify(doctorData), "EX", 600);
    }

    return { message: "OTP sent to email and mobile. Please verify." };
  },
  
  async verifyAndCreateUser(email: string, mobile_num: string, emailOtp: string, mobileOtp: string) {
    try {
      if (!mobileOtp || mobileOtp.length !== 6 || mobileOtp === null) {
        throw new Error("Please Enter a valid OTP.");
      }
      await otpService.verifyMobileOtp(mobile_num, mobileOtp);
  
      if (emailOtp && emailOtp.length !== 6) {
        throw new Error("Please Enter a valid email OTP.");
      }
  
      if (email && emailOtp) {
        await otpService.verifyEmailOtp(email, emailOtp);
      }
  
      const userDataJson = await redis.get(`user:temp:${email}`);
      if (!userDataJson) {
        throw new Error("User data expired. Please register again.");
      }
  
      const userData = JSON.parse(userDataJson);
      const hashedPassword = await hashPassword(userData.Password);
  
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
  
      if (userData.UserType?.toLowerCase() === "doctor") {
        const doctorDataJson = await redis.get(`doctor:temp:${email}`);
        if (!doctorDataJson) {
          throw new Error("Doctor registration data expired. Please register again.");
        }
  
        const doctorData = JSON.parse(doctorDataJson);
        
        // Convert user.ID to string before passing to doctorService
        await doctorService.createDoctorDetails(
          doctorData.licenseRegistrationNo,
          doctorData.qualifications,
          doctorData.collegeName,
          doctorData.courseYear,
          user.ID.toString() // Convert to string here
        );
  
        await redis.del(`doctor:temp:${email}`);
      }
  
      const token = generateToken({ userId: user.ID.toString() });
      if (!token) {
        throw new Error("Token generation failed.");
      }
  
      await redis.del(`user:temp:${email}`);
  
      // Sanitize user data for response
      const sanitizedUser = {
        ...user,
        ID: user.ID.toString(),
        CreatedAt: user.CreatedAt?.toISOString() || null,
        UpdatedOn: user.UpdatedOn?.toISOString() || null
      };
  
      return {
        token,
        user: sanitizedUser
      };
    } catch (error) {
      console.error("Error in verifyAndCreateUser:", error);
      throw error;
    }
  },

  async loginUser(
    { identifier, Password }: { identifier: string; Password: string },
    res: any
  ) {
    if (!identifier || !Password) {
      throw new Error("Identifier (Email/Mobile) and Password are required.");
    }
  
    const normalizeMobileNumber = (number: string): string => {
      const digits = number.replace(/\D/g, '');
      return digits.length === 10 ? `+91${digits}` : number;
    };
  
    const isMobile = /^\d{10}$/.test(identifier);
    const whereClause = isMobile 
      ? { mobile_num: normalizeMobileNumber(identifier) }
      : { EmailID: identifier };
  
    const user = await prisma.userMaster.findUnique({ where: whereClause });
    if (!user) {
      throw new Error("User not found.");
    }
  
    const isValid = await comparePassword(Password, user.Password);
    if (!isValid) {
      throw new Error("Invalid credentials.");
    }
  
    const token = generateToken({ userId: user.ID.toString() });
    res.cookie("token", token, { httpOnly: true });
  
    return { 
      token,
      user: sanitizeUserForResponse(user)
    };
  },

  async getUserById(userId: string) {
    const cacheKey = `user:${userId}`;
    let user: UserMaster | null;

    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      user = restoreBigInt(JSON.parse(cachedUser)) as UserMaster;
    } else {
      user = await prisma.userMaster.findUnique({ 
        where: { ID: BigInt(userId) } 
      });
      
      if (user) {
        await redis.set(cacheKey, safeStringify(user), "EX", 3600);
      }
    }

    return sanitizeUserForResponse(user);
  },
};