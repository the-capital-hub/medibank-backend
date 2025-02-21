import { forgotPasswordService } from "../../services/forgotPassService";
import { profileUploadService } from "../../services/ProfilePicService";
import { userService } from "../../services/userService";
import { Context } from "../../types/context";

// Matches the GraphQL User type
interface User {
  ID: string | bigint;  // Allow both string and bigint
  MBID: string;
  fullname: string;
  EmailID: string;
  mobile_num: string;
  city: string | null;
  state: string | null;
  date_of_birth: Date | null;
  sex: string;
  Password?: string;
  profilePicture?: string;
  UserType?: string | null;
  CreatedAt?: string|null;
  UpdatedOn?: string|null;
  profile_Picture?: string | null;
}

// Matches the GraphQL StandardResponse type
interface StandardResponse {
  status: boolean;
  data?: any;
  message: string;
}

// Updated UserServiceResponse to match service response
interface UserServiceResponse {
  status: boolean;
  user?: User;
  message: string;
}

interface SanitizedUser extends Omit<User, 'ID'> {
  ID: string;
}

// Enhanced safeStringify utility to handle BigInt
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

// Enhanced sanitizeUser function to handle BigInt
function sanitizeUser(user: User | null): SanitizedUser | null {
  if (!user) return null;
  
  // Create a new object with all properties converted
  const sanitized = JSON.parse(safeStringify(user));
  
  // Ensure ID is always a string
  if (sanitized.ID) {
    sanitized.ID = sanitized.ID.toString();
  }
  
  return sanitized;
}

function formatResponse(status: boolean, data: any = null, message: string): StandardResponse {
  return { status, data, message };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

function isValidUser(user: any): user is User {
  return user && typeof user === 'object' && 'ID' in user && 'MBID' in user;
}

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context): Promise<StandardResponse> => {
      const userId = req.user;
      if (!userId) return formatResponse(false, null, "User not authenticated");

      try {
        const user = await userService.getUserById(userId);
        const sanitizedUser = sanitizeUser(user);
        return formatResponse(true, sanitizedUser, "User fetched successfully");
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error fetching user:", errorMessage);
        return formatResponse(false, null, "Failed to fetch user");
      }
    },
  },

  Mutation: {
    register: async (_: unknown, args: {
      fullname: string;
      EmailID: string;
      mobile_num: string;
      city: string;
      state: string;
      date_of_birth: string;
      sex: string;
      Password: string;
      userType?: string;
      licenseRegistrationNo?: string;
      qualifications?: string;
      collegeName?: string;
      courseYear?: string;
    }, { redis }: Context): Promise<StandardResponse> => {
      try {
        console.log("Before calling userService.registerUser");
        console.log("args.userType:", args.userType);
        
        const serviceResult = await userService.registerUser({
          fullname: args.fullname,
          EmailID: args.EmailID,
          mobile_num: args.mobile_num,
          city: args.city,
          state: args.state,
          date_of_birth: args.date_of_birth,
          sex: args.sex,
          Password: args.Password,
          UserType: args.userType,
          licenseRegistrationNo: args.licenseRegistrationNo,
          qualifications: args.qualifications,
          collegeName: args.collegeName,
          courseYear: args.courseYear
        }, redis);

        const result = {
          message: typeof serviceResult === 'object' && 'message' in serviceResult ? serviceResult.message : 'Registration completed',
          status: typeof serviceResult === 'object' && 'status' in serviceResult ? serviceResult.status : true,
          user: typeof serviceResult === 'object' && 'user' in serviceResult ? serviceResult.user : undefined
        };
        
        console.log("After calling userService.registerUser");
        if (!result.status) {
          return formatResponse(false, null, result.message);
        }
        
        console.log("Completing registration");
        return formatResponse(
          true,
          result.user && isValidUser(result.user) ? { user: sanitizeUser(result.user) } : null,
          result.message
        );

      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in register resolver:", errorMessage);
        return formatResponse(false, null, errorMessage);
      }
    },

    sendRegistrationOtp: async (_: unknown, { EmailID, MobileNo }: any, { redis }: Context) => {
      try {
        const result = await userService.registerUser(
          { EmailID, mobile_num: MobileNo },
          redis
        );
        return formatResponse(true, null, result.message);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in sendRegistrationOtp resolver:", errorMessage);
        return formatResponse(false, null, errorMessage);
      }
    },

    verifyAndRegisterUser: async (_: unknown, { 
      EmailID, mobile_num, emailOtp, mobileOtp 
    }: {
      EmailID: string;
      mobile_num: string;
      emailOtp: string;
      mobileOtp: string;
    }, { redis }: Context) => {
      try {
        const userData = await userService.verifyAndCreateUser(
          EmailID, 
          mobile_num, 
          emailOtp, 
          mobileOtp
        );
    
        if (!userData || !userData.token) {
          console.error("❌ Token or user missing in response:", userData);
          throw new Error("Token generation failed.");
        }
    
        // Sanitize the user data before returning
        const sanitizedUser = sanitizeUser(userData.user);
    
        return {
          status: true,
          data: { 
            token: userData.token, 
            user: sanitizedUser 
          },
          message: "User registered successfully",
        };
    
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("❌ Error in verifyAndRegisterUser resolver:", errorMessage);
    
        return { 
          status: false, 
          data: null, 
          message: errorMessage 
        };
      }
    },

    uploadProfileAfterVerification: async (_: unknown, { base64Data }: { base64Data: string | null}, { req }: Context) => {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          throw new Error('Token is required');
        }

        const result = await profileUploadService.uploadProfileAfterVerification(base64Data, token);

        if (!result.success) {
          throw new Error(result.message || 'Upload failed');
        }

        return {
          status: true,
          data: {
            imageUrl: result.imageUrl,
          },
          message: result.message,
        };

      } catch (error) {
        console.error('Error in uploadProfileAfterVerification:', error);
        return {
          status: false,
          data: null,
          message: error instanceof Error ? error.message : 'Error processing profile picture',
        };
      }
    },

    login: async (_: unknown, { EmailOrMobile, Password }: any, { res }: Context) => {
      try {
        const result = await userService.loginUser(
          { 
            identifier: EmailOrMobile, 
            Password 
          },  
          res
        );

        if (!result || !result.token) {
          throw new Error("Token Generation Failed!");
        }

        // Sanitize user data before returning
        const sanitizedUser = sanitizeUser(result.user);

        return {
          status: true,
          data: {
            token: result.token,
            user: sanitizedUser
          },
          message: "Login Successful"
        };
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

    sendOtpForReset: async (_: unknown, { EmailIdOrMobile }: any) => {
      try {
        const result = await forgotPasswordService.initiatePasswordReset(EmailIdOrMobile);
        return {
          status: true,
          data: result.data,
          message: result.message
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in initiatePasswordReset resolver:", errorMessage);
        return {
          status: false,
          data: null,
          message: errorMessage
        };
      }
    },

    verifyOtpAndUpdatePassword: async (_: unknown, { EmailIdOrMobile, otp, newPassword, confirmPassword }: any) => {
      try {
        const result = await forgotPasswordService.verifyOtpAndUpdatePassword(
          EmailIdOrMobile,
          otp,
          newPassword,
          confirmPassword
        );

        return {
          status: true,
          message: result.message
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error("Error in verifyOtpAndUpdatePassword resolver:", errorMessage);
        return {
          status: false,
          message: errorMessage
        };
      }
    }
  }
}