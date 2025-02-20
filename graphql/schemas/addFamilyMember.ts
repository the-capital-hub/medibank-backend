import { gql } from "apollo-server-express";
import { GraphQLJSON } from "graphql-scalars";

export const addFamilyMemberSchemaTypeDefs = gql`
  type AddFamilyMember {
    ID: ID!
    familyMemberId: String!
    familyMemberName: String!
    familyMemberRelation: String!
    userId: ID!
    createdOn: DateTime!
    updatedOn: DateTime!
    createdById: ID!
  }
    type Query {
        me: User!
        getAllFamilyMembers: StandardResponse!
        deleteFamilyMember(familyMemberId: String!): deleteFamilyMemberResponse!
    }
type deleteFamilyMemberResponse{
    status: Boolean
    data: JSON
    message: String!
    
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
    familyMembers: [AddFamilyMember!]
  }

  type StandardResponse {
    status: Boolean!
    data: JSON
    message: String
  }
    type Mutation {
        createFamilyMember( familyMemberName: String!, familyMemberRelation: String!, mbid: String!): StandardResponse!
    }
`;
export const resolvers = {
    JSON: GraphQLJSON,
  };