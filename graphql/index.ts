import { userTypeDefs } from "./schemas/user";
import { mergeTypeDefs } from '@graphql-tools/merge';
import { userResolvers } from "./resolvers/user";
import { userAppointmentTypeDefs } from "./schemas/userAppointmentSchema";
import { userAppointmentResolvers } from "./resolvers/userAppointmentResolver";
import{userLabReportTypeDefs} from "./schemas/userLabReportSchema"
import { userLabReportResolvers } from "./resolvers/userLabReportResolver";
import { userHospitalReportTypeDefs } from "./schemas/userHospitalReportSchema";
import { userHospitalReportResolvers } from "./resolvers/userHospitalReportResolver";

export const typeDefs = mergeTypeDefs([userTypeDefs, userAppointmentTypeDefs, userLabReportTypeDefs, userHospitalReportTypeDefs]);
export const resolvers = [userResolvers, userAppointmentResolvers, userLabReportResolvers, userHospitalReportResolvers];
