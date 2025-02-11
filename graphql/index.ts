import { userTypeDefs } from "./schemas/user";
import { mergeTypeDefs } from '@graphql-tools/merge';
import { userResolvers } from "./resolvers/user";
import { userAppointmentTypeDefs } from "./schemas/userAppointmentSchema";
import { userAppointmentResolvers } from "./resolvers/userAppointmentResolver";

export const typeDefs = mergeTypeDefs([userTypeDefs, userAppointmentTypeDefs]);
export const resolvers = [userResolvers, userAppointmentResolvers];
