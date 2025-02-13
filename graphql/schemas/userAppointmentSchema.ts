// graphql/typeDefs.ts
import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userAppointmentTypeDefs = gql`
  scalar JSON
  scalar BigInt
  scalar DateTime

  type UserAppointment {
    ID: ID
    appointmentId: String
    doctorName: String
    selectDate: String
    hospitalName: String
    chiefComplaint: String
    PatientName: String
    vitals: String
    remarks: String
    uploadPrescription: String
    uploadReport: String
    createdOn: DateTime
    updatedOn: DateTime
    user: User
    createdBy: User
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
  }

  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }

  type Query {
    me: User!
    getUserAppointment(appointmentId: String!): UserAppointment
    getAllUserAppointments: StandardResponse!
  }

  type Mutation {
    createUserAppointment(
      doctorName: String!
      selectDate: String!
      hospitalName: String!
      chiefComplaint: String!
      patientName: String!
      vitals: String
      remarks: String
      uploadPrescription: String
      uploadReport: String
    ): StandardResponse!
  }
`;
export const resolvers = {
    JSON: GraphQLJSON
};