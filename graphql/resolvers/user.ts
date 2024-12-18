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
    register: async (_: unknown, args: any, { redis }: Context) =>
      userService.registerUser(args, redis),
    login: async (_: unknown, args: any, { redis, res }: Context) =>
      userService.loginUser(args, redis, res),
  },
};
