"use strict";
// import { gql } from "apollo-server-express";
// import bcrypt from "bcryptjs";
// import jwt, { JwtPayload } from "jsonwebtoken";
// import { BigIntResolver } from "graphql-scalars";
// const typeDefs = gql`
// scalar BigInt
//   type User {
//     ID: BigInt!
//     MBID: String!
//     EmailID: String!
//     FirstName: String!
//     LastName: String
//     Gender: Boolean
//     MobileNo: String!
//   }
//   type AuthPayload {
//     token: String!
//     user: User!
//   }
//   type Query {
//     me: User
//   }
//   type Mutation {
//     register(
//       EmailID: String!
//       Password: String!
//       FirstName: String!
//       LastName: String
//       MobileNo: String!
//       UserType: String!
//     ): AuthPayload
//     login(EmailID: String!, Password: String!): AuthPayload
//   }
// `;
// const resolvers = {
//   BigInt: BigIntResolver,
//   Query: {
//     me: async (_: any, __: any, { prisma, redis, req }: any) => {
//       const token = req.cookies.token;
//       if (!token) return null;
//       try {
//         const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
//         const cacheKey = `user:${userId}`;
//         // Check Redis cache
//         let user = await redis.get(cacheKey);
//         if (user) {
//           return JSON.parse(user);
//         }
//         // Fetch from DB if not cached
//         user = await prisma.userMaster.findUnique({ where: { ID: BigInt(userId) } });
//         if (user) {
//           await redis.set(cacheKey, JSON.stringify(user), "EX", 3600); // Cache for 1 hour
//         }
//         return {user: { ...user, ID: user.ID.toString() }};
//       } catch {
//         return null;
//       }
//     },
//   },
//   Mutation: {
//     register: async (
//       _: any,
//       { EmailID, Password, FirstName, LastName, MobileNo, UserType }: any,
//       { prisma, redis }: any
//     ) => {
//       const hashedPassword = await bcrypt.hash(Password, 10);
//       const user = await prisma.userMaster.create({
//         data: {
//           EmailID,
//           Password: hashedPassword,
//           FirstName,
//           LastName,
//           MobileNo,
//           MBID: `MB${Math.random().toString().slice(2, 10)}`,
//           UserType,
//         },
//       });
//       const token = jwt.sign({ userId: user.ID.toString() }, process.env.JWT_SECRET!);
//       // Cache user data with ID as string
//       // await redis.set(
//       //   `user:${user.ID.toString()}`,
//       //   JSON.stringify({ ...user, ID: user.ID.toString() }),
//       //   "EX",
//       //   3600
//       // );
//       return { token, user: { ...user, ID: user.ID.toString() } };
//     },
//     login: async (_: any, { EmailID, Password }: any, { prisma, redis, res }: any) => {
//       const cacheKey = `user:${EmailID}`;
//       // Check Redis for user
//       let user = await redis.get(cacheKey);
//       if (user) {
//         user = JSON.parse(user);
//       } else {
//         user = await prisma.userMaster.findUnique({ where: { EmailID } });
//         if (!user) throw new Error("User not found");
//         // Cache user data
//         await redis.set(cacheKey, JSON.stringify({user: { ...user, ID: user.ID.toString() }}), "EX", 3600);
//       }
//       // Validate if user has a Password
//       if (!user.Password) {
//         throw new Error("User record is invalid: Password is missing");
//       }
//       const isValid = await bcrypt.compare(Password, user.Password);
//       if (!isValid) throw new Error("Invalid password");
//       const token = jwt.sign({ userId: user.ID.toString() }, process.env.JWT_SECRET!);
//       res.cookie("token", token, { httpOnly: true });
//       return { token, user: { ...user, ID: user.ID.toString() } };
//     },
//   },
// };
// export { typeDefs, resolvers };
