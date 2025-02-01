import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const userTypeDefs = gql`
  scalar BigInt
  scalar JSON
  scalar Upload

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
    profilePicture: String
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

  type PresignedUrlResponse {
    uploadUrl: String!
    imageUrl: String!
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

    sendRegistrationOtp(EmailID: String!, mobile_num: String!): StandardResponse

    verifyAndRegisterUser(
      EmailID: String!
      mobile_num: String!
      OTP: String!
    ): AuthPayload

    uploadProfileAfterVerification(userId: String!, file: Upload!): StandardResponse
    login(EmailID: String!, Password: String!): AuthPayload

  }
`;

export const resolvers = {
  JSON: GraphQLJSON,
};
