import { userService } from "../../services/userService";
import { Context } from "../../types/context";

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context) => {
      const userId = req.user;
      if (!userId) return null;
      return userService.getUserById(userId);
    },
  },
  Mutation: {
    register: async (_: unknown, args: any, { redis }: Context) => {
      try {
        console.log("Register mutation args:", args);
    
        const result = await userService.registerUser(args, redis);
        console.log("User service result:", result);
        
        return result.message;
      } catch (error) {
        console.error("Error in register resolver:", error);
        throw new Error("Failed to send OTP. Please try again.");
      }
    },
    
    sendRegistrationOtp: async (_: any, { EmailID, MobileNo }: any, { redis }: any) => {
      return userService.registerUser({ EmailID, MobileNo }, redis);
    },
    verifyAndRegisterUser: async (_: any, { EmailID, MobileNo, OTP }: any, { redis }: any) => {
      return userService.verifyAndCreateUser(EmailID, MobileNo, OTP);
    },
    
    login: async (_: unknown, args: any, { redis, res }: Context) =>
      userService.loginUser(args, redis, res),
  },
};
