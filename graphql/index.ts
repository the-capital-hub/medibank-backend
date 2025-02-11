import { userTypeDefs } from "./schemas/user";
import { mergeTypeDefs } from '@graphql-tools/merge';
import { userResolvers } from "./resolvers/user";
import { userAppointmentTypeDefs } from "./schemas/userAppointmentSchema";
import { userAppointmentResolvers } from "./resolvers/userAppointmentResolver";
import{userLabReportTypeDefs} from "./schemas/userLabReportSchema"
import { userLabReportResolvers } from "./resolvers/userLabReportResolver";

export const typeDefs = mergeTypeDefs([userTypeDefs, userAppointmentTypeDefs, userLabReportTypeDefs]);
export const resolvers = [userResolvers, userAppointmentResolvers, userLabReportResolvers];
