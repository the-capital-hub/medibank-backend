import prisma from "../models/prismaClient";
import redis from "../redis/redisClient";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { UserMaster } from "@prisma/client";

export const userService = {

    async registerUser(
        { EmailID, Password, FirstName, LastName, MobileNo, UserType }: Partial<UserMaster>,
        redis: any
      ) {
        if (!EmailID || !Password || !FirstName || !MobileNo || !UserType) {
          throw new Error("Missing required fields for user registration.");
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
    
        // Cache user data
        await redis.set(`user:${user.ID.toString()}`, JSON.stringify(user), "EX", 3600);
    
        return { token, user };
    },

  async loginUser(
    { EmailID, Password }: { EmailID: string; Password: string },
    redis: any,
    res: any
  ) {
    // Validate required fields
    if (!EmailID) {
      throw new Error("EmailID is required.");
    }
    if (!Password) {
      throw new Error("Password is required.");
    }

    const cacheKey = `user:${EmailID}`;
    let user: UserMaster | null;

    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      // If Redis data exists, parse it as a valid JSON object
      user = JSON.parse(cachedUser) as UserMaster;
    } else {
      // Otherwise, fetch user from the database
      user = await prisma.userMaster.findUnique({ where: { EmailID } });
      if (!user) {
        throw new Error("User not found");
      }
      // Cache the user data as a string in Redis
      await redis.set(cacheKey, JSON.stringify(user), "EX", 3600); // Cache for 1 hour
    }

    // Validate the user's password
    const isValid = await comparePassword(Password, user.Password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Generate a JWT token
    const token = generateToken({ userId: user.ID.toString() });
    res.cookie("token", token, { httpOnly: true });

    return { token, user };
  },

  async getUserById(userId: string) {
    const cacheKey = `user:${userId}`;
    let user: UserMaster | null;

    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      // If Redis data exists, parse it as a valid JSON object
      user = JSON.parse(cachedUser) as UserMaster;
    } else {
      // Otherwise, fetch user from the database
      user = await prisma.userMaster.findUnique({ where: { ID: BigInt(userId) } });
      if (user) {
        // Cache the user data as a string in Redis
        await redis.set(cacheKey, JSON.stringify(user), "EX", 3600); // Cache for 1 hour
      }
    }

    return user;
  },
};
