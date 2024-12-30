
import { gql } from "apollo-server-express";

export const userTypeDefs = gql`
  scalar BigInt

  type User {
    ID: BigInt!
    MBID: String!
    EmailID: String!
    FirstName: String!
    LastName: String
    Gender: Boolean
    MobileNo: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
  }

  type Mutation {
    register(
      EmailID: String!
      Password: String!
      FirstName: String!
      LastName: String
      MobileNo: String!
      UserType: String!
    ): String

    sendRegistrationOtp(
      EmailID: String!
      MobileNo: String!
    ): String

    verifyAndRegisterUser(
      EmailID: String!
      MobileNo: String!
      OTP: String!
    ): AuthPayload
    
    login(EmailID: String!, Password: String!): AuthPayload
  }
`;
