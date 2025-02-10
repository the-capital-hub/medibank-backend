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
    user: User!
    status: Boolean
    data: JSON
    message: String
  }

  type Query {
    me: User
  }

  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }

type UploadResponse {
  status: Boolean!
  data: JSON
  message: String
}

type ResetPasswordResponse {
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

    sendRegistrationOtp(EmailID: String!, mobile_num: String!): StandardResponse

    verifyAndRegisterUser(
      EmailID: String!
      mobile_num: String!
      emailOtp: String
      mobileOtp: String!
    ): StandardResponse

    uploadProfileAfterVerification(base64Data: String): UploadResponse

    login(EmailOrMobile: String!, Password: String!): AuthPayload

    sendOtpForReset(EmailIdOrMobile: String!,): StandardResponse

    verifyOtpAndUpdatePassword(
      EmailIdOrMobile: String!
      otp: String!
      newPassword: String!
      confirmPassword: String!
    ): ResetPasswordResponse
  }
`;

export const resolvers = {
  JSON: GraphQLJSON,
};
