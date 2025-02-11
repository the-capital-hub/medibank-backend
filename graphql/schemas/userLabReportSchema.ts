// graphql/typeDefs.ts
import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userLabReportTypeDefs = gql`
  scalar JSON
  scalar BigInt
  scalar DateTime

  type UserLapReport {
    ID: BigInt!
    labReportId: String!
    labReportType: String!
    selectDate: String!
    labName: String!
    doctorName: String!
    selectFamilyMember: String!
    uploadLabReport: String
    createdOn: DateTime!
    updatedOn: DateTime!
    user: User!
    createdBy: User!
    updatedBy: User
  }

  type User {
    ID: BigInt!
    MBID: String!
    fullname: String!
    EmailID: String!
    mobile_num: String!
    city: String
    state: String
    date_of_birth: String!
    sex: String!
    profile_Picture: String
    appointments: [UserAppointment!]
    labReports: [UserLapReport!]
  }

  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }

  type Query {
    me: User
    getUserLapReport(labReportId: String!): UserLapReport
    getUserLapReports: StandardResponse!
  }

  type Mutation {
    createUserLabReport(
      labReportType: String!
      selectDate: String!
      labName: String!
      doctorName: String!
      selectFamilyMember: String!
      uploadLabReport: String
    ): StandardResponse!
  }
`;

export const resolvers = {
  JSON: GraphQLJSON
};
