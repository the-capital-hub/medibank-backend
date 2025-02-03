import { profileUploadService } from "../../services/ProfilePicService";
import { userService } from "../../services/userService";
import { Context } from "../../types/context";


function formatResponse(status: boolean, data: any = null, message: string = "") {
  return { status, data, message };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context) => {
      const userId = req.user;
      if (!userId) return formatResponse(false, null, "User not authenticated");

      try {
        const user = await userService.getUserById(userId);
        return formatResponse(true, user, "User fetched successfully");
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error fetching user:", errorMessage);
        return formatResponse(false, null, "Failed to fetch user");
      }
    },
  },

  Mutation: {
    register: async (_: unknown, args: any, { redis }: Context) => {
      try {
        const result = await userService.registerUser(args, redis);
        return { status: true, data: null, message: result.message };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in register resolver:", errorMessage);
        return { status: false, data: null, message: errorMessage };
      }
    },

    sendRegistrationOtp: async (
      _: unknown,
      { EmailID, MobileNo }: any,
      { redis }: Context
    ) => {
      try {
        const result = await userService.registerUser(
          { EmailID, MobileNo },
          redis
        );
        return formatResponse(true, null, result.message);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in sendRegistrationOtp resolver:", errorMessage);
        return formatResponse(false, null, errorMessage);
      }
    },

    verifyAndRegisterUser: async (_: unknown, { EmailID, mobile_num, OTP }: any, { redis }: Context) => {
      try {
        
        const userData = await userService.verifyAndCreateUser(EmailID, mobile_num, OTP);
        
        if (!userData || !userData.token) {
          console.error("❌ Token or user missing in response:", userData);
          throw new Error("Token generation failed.");
        }
    
        // Convert BigInt fields to strings (if any exist)
        const sanitizedUser = {
          ...userData.user,
          ID: userData.user.ID.toString()  // Convert BigInt to String
        };
    
        return {
          status: true,
          data: { 
            token: userData.token,
            user: sanitizedUser  // Return sanitized user with string ID
          },
          message: "User registered successfully"
        };
    
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("❌ Error in verifyAndRegisterUser resolver:", errorMessage);
    
        return { status: false, data: null, message: errorMessage };
      }
    },
    uploadProfileAfterVerification: async (
      _: unknown,
      { base64Data }: { base64Data: string },  // Changed from file to base64Data
      { req }: Context
    ) => {
      console.log(base64Data)
      console.log('Starting uploadProfileAfterVerification mutation');
    
      try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          throw new Error('Token is required');
        }
    
        if (!base64Data) {
          throw new Error('Base64 data is required');
        }
    
        console.log('Processing base64 data:', base64Data);
    
        // Call the profile upload service with base64 data
        const uploadResult = await profileUploadService.uploadProfilePicture(token, base64Data);
    
        if (!uploadResult.success) {
          throw new Error(uploadResult.message);
        }
    
        return {
          status: true,
          data: {
            imageUrl: uploadResult.imageUrl,
            presignedUrl: uploadResult.presignedUrl,
          },
          message: 'Profile picture uploaded successfully',
        };
    
      } catch (error) {
        console.error('Error in uploadProfileAfterVerification:', error);
        return {
          status: false,
          data: null,
          message: error instanceof Error ? error.message : 'Error uploading profile picture',
        };
      }
    },
    
    
    
    login: async (_: unknown, args: any, { redis, res }: Context) => {
      try {
        const result = await userService.loginUser(args, redis, res);
        if(!result || !result.token){
          throw new Error("Token Generation Failed!")
        }

        const sanitizedUser =  {
          ...result.user,
          ID: result.user.ID.toString()
        }

        return {
          status: true,
          data: {
            token: result.token,
            user: sanitizedUser
          },
          message: "Login Successful"
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in login resolver:", errorMessage);
        return {
          status: false,
          data: null,
          message: errorMessage
        };
      }
    },
  },
};
