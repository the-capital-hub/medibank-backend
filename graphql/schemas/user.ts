import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userTypeDefs = gql`
  scalar BigInt
  scalar JSON

  type User {
    ID: BigInt!
    MBID: String!
    fullname: String!
    EmailID: String!
    mobile_num: String!
    city: String!
    state: String!
    date_of_birth: String!
    sex: String!
    Password: String
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
      fullname: String!
      EmailID: String!
      mobile_num: String!
      city: String!
      state: String!
      date_of_birth: String!
      sex: String!
      Password: String!
      UserType: String!
    ): StandardResponse

    sendRegistrationOtp(
      EmailID: String!
      mobile_num: String!
    ): StandardResponse

    verifyAndRegisterUser(
      EmailID: String!
      mobile_num: String!
      OTP: String!
    ): AuthPayload

    login(EmailID: String!, Password: String!): AuthPayload
  }
`;

export const resolvers = {
  JSON: GraphQLJSON,
};
