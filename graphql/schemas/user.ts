import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userTypeDefs = gql`
  scalar BigInt
  scalar JSON

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
  
  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }

  type Mutation {
    register(
      EmailID: String!
      Password: String!
      FirstName: String!
      LastName: String
      MobileNo: String!
      UserType: String!
    ): StandardResponse

    sendRegistrationOtp(
      EmailID: String!
      MobileNo: String!
    ): StandardResponse

    verifyAndRegisterUser(
      EmailID: String!
      MobileNo: String!
      OTP: String!
    ): AuthPayload

    login(EmailID: String!, Password: String!): AuthPayload
  }
`;

export const resolvers = {
  JSON: GraphQLJSON,
};
