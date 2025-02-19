import { userTypeDefs } from "./schemas/user";
import { mergeTypeDefs } from '@graphql-tools/merge';
import { userResolvers } from "./resolvers/user";
import { userAppointmentTypeDefs } from "./schemas/userAppointmentSchema";
import { userAppointmentResolvers } from "./resolvers/userAppointmentResolver";
import{userLabReportTypeDefs} from "./schemas/userLabReportSchema"
import { userLabReportResolvers } from "./resolvers/userLabReportResolver";
import { userHospitalReportTypeDefs } from "./schemas/userHospitalReportSchema";
import { userHospitalReportResolvers } from "./resolvers/userHospitalReportResolver";
import { addFamilyMemberSchemaTypeDefs } from "./schemas/addFamilyMember";
import { addFamilyMemberResolver } from "./resolvers/addFamilyMemberResolver";


export const typeDefs = mergeTypeDefs([userTypeDefs, userAppointmentTypeDefs, userLabReportTypeDefs, userHospitalReportTypeDefs, addFamilyMemberSchemaTypeDefs]);
export const resolvers = [userResolvers, userAppointmentResolvers, userLabReportResolvers, userHospitalReportResolvers, addFamilyMemberResolver];
