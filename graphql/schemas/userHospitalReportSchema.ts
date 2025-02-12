import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userHospitalReportTypeDefs = gql`
  scalar JSON
  scalar BigInt
  scalar DateTime

  type UserHospitalReport {
    ID: BigInt!
    hospitalReportId: String!
    hospitalName: String!
    selectDate: String!
    doctorName: String!
    procedure: String!
    PatientName: String!
    remarks: String
    uploadHospitalReport: String
    hospitalImage: String
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
    hospitalReports: [UserHospitalReport!]
  }

  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }

  type Query {
    getUserHospitalReport(hospitalReportId: String!): UserHospitalReport
    getUserHospitalReports: StandardResponse!
  }

  type Mutation {
    createUserHospitalReport(
      hospitalName: String!
      selectDate: String!
      doctorName: String!
      procedure: String!
      patientName: String!
      remarks: String!
      uploadHospitalReport: String!
    ): StandardResponse!
  }
`;

export const resolvers = {
    JSON: GraphQLJSON
};
