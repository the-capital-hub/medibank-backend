import { addFamilyMemberService } from "../../services/addFamilyMemberService";
import { Context } from "../../types/context";

interface FamilyMemberResponse {
  status: boolean;
  data: {
    familyMemberId: string;
    familyMemberName: string;
    familyMemberRelation: string;
    userMBID: string;
  }[] | null;
  message: string;
}

function formatResponse<T>(status: boolean, data: T | null = null, message = "") {
  try {
    const replacer = (key: string, value: any) => {
      if (typeof value === "bigint") {
        return value.toString(); // Convert BigInt to string
      }
      return value === undefined ? null : value;
    };

    const stringifiedData = JSON.stringify(data, replacer);
    const serializedData = data ? JSON.parse(stringifiedData) : null;
    
    return { status, data: serializedData, message };
  } catch (error) {
    console.error("Error in formatResponse:", error);
    return {
      status: false,
      data: null,
      message: error instanceof Error ? `Serialization error: ${error.message}` : "Error processing response",
    };
  }
}

// Function to format delete response
function deleteFamilyMemberResponse(status: boolean, data: any, message: string) {
  if (data && typeof data === "object") {
    data = JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
  }

  return {
    status,
    data,
    message,
  };
}


function validateFamilyMemberInput(input: {
  familyMemberName: string;
  familyMemberRelation: string;
  mbid: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input.familyMemberName?.trim()) {
    errors.push("Family member name is required");
  }
  
  if (!input.familyMemberRelation?.trim()) {
    errors.push("Family member relation is required");
  }

  if (!input.mbid?.trim()) {
    errors.push("MBID is required");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export const addFamilyMemberResolver = {
  Query: {
    getAllFamilyMembers: async (
      _: unknown,
      { token }: { token: string },
      { req }: Context
    ): Promise<FamilyMemberResponse> => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Authorization token is required');
        }

        const familyMembers = await addFamilyMemberService.getAllFamilyMembers(token);
        
        if (!familyMembers || familyMembers.length === 0) {
          return formatResponse(true, [], "No family members found");
        }

        return formatResponse(
          true,
          familyMembers,
          "Family members fetched successfully"
        );

      } catch (error) {
        console.error("Error fetching family members:", error);
        return formatResponse(
          false,
          null,
          error instanceof Error ? error.message : 'An error occurred while fetching family members'
        );
      }
    },
    deleteFamilyMember: async (_: any, { familyMemberId }: { familyMemberId: string }, { req }: Context) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return formatResponse(false, null, "Authentication token is required");
        }
        const deletedFamilyMember = await addFamilyMemberService.deleteFamilyMember(familyMemberId, token);
        return deleteFamilyMemberResponse(
          true,
          deletedFamilyMember,
          "Family member deleted successfully"
        )
        
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return deleteFamilyMemberResponse(
          false,
          null,
          `Failed to delete family member: ${errorMessage}`
        );
      }
    },
  },

  Mutation: {
    createFamilyMember: async (
      _: unknown,
      {
        familyMemberName,
        familyMemberRelation,
        mbid
      }: {
        familyMemberName: string;
        familyMemberRelation: string;
        mbid: string;
      },
      { req }: Context
    ): Promise<FamilyMemberResponse> => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return formatResponse(false, null, "Authentication token is required");
        }

        // Validate input
        const validation = validateFamilyMemberInput({
          familyMemberName,
          familyMemberRelation,
          mbid
        });

        if (!validation.isValid) {
          return formatResponse(
            false,
            null,
            `Validation failed: ${validation.errors.join('; ')}`
          );
        }

        // Sanitize input
        const sanitizedInput = {
          familyMemberName: familyMemberName.trim(),
          familyMemberRelation: familyMemberRelation.trim(),
          mbid: mbid.trim()
        };

        const newFamilyMember = await addFamilyMemberService.createFamilyMember(
          sanitizedInput.familyMemberName,
          sanitizedInput.familyMemberRelation,
          token,
          sanitizedInput.mbid
        );

        return formatResponse(
          true,
          [newFamilyMember],
          "Family member created successfully"
        );

      } catch (error) {
        console.error("Error creating family member:", error);
        return formatResponse(
          false,
          null,
          error instanceof Error
            ? `Error creating family member: ${error.message}`
            : 'An unexpected error occurred while creating the family member'
        );
      }
    },

  
  }
};