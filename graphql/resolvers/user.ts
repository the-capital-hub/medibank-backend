import { forgotPasswordService } from "../../services/forgotPassService";
import { profileUploadService } from "../../services/ProfilePicService";
import { userService } from "../../services/userService";
import { doctorService } from '../../services/doctorService';
import { Context } from "../../types/context";

// Matches the GraphQL User type
interface User {
  ID: bigint;
  MBID: string;
  fullname: string;
  EmailID: string;
  mobile_num: string;
  city: string;
  state: string;
  date_of_birth: string;
  sex: string;
  Password?: string;
  profilePicture?: string;
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

// Doctor service response
interface DoctorServiceResponse {
  success: boolean;
  error?: string;
  data?: {
    ID: bigint;
    licenseRegistrationNo: string;
    qualification: string;
    collegeName: string;
    courseYear: string;
    city: string;
    state: string;
    userId: bigint;
    createdById: bigint;
    createdAt: Date;
    updatedAt: Date;
    updatedById?: bigint | null;
  };
}

// Doctor details input interface
interface DoctorDetailsInput {
  licenseRegistrationNo: string;
  qualification: string;
  collegeName: string;
  courseYear: string;
  city: string;
  state: string;
  userId: string;
  createdById: string;
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

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { req }: Context): Promise<StandardResponse> => {
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
      qualification?: string;
      collegeName?: string;
      courseYear?: string;
    }, { redis }: Context): Promise<StandardResponse> => {
      try {
        // Step 1: Register base user
        console.log("Before calling userService.registerUser");
        console.log("args.userType:", args.userType);
        const serviceResult: UserServiceResponse = await userService.registerUser({
          fullname: args.fullname,
          EmailID: args.EmailID,
          mobile_num: args.mobile_num,
          city: args.city,
          state: args.state,
          date_of_birth: args.date_of_birth,
          sex: args.sex,
          Password: args.Password,
          UserType: args.userType
        }, redis) as UserServiceResponse;

        const result: UserServiceResponse = {
          message: typeof serviceResult === 'object' && 'message' in serviceResult ? serviceResult.message : 'Registration completed',
          status: typeof serviceResult === 'object' && 'status' in serviceResult ? serviceResult.status : true,
          user: typeof serviceResult === 'object' && 'user' in serviceResult? serviceResult.user : undefined
        };

        console.log("Base user registration complete. Result:", {
          status: result.status,
          userId: result.user?.ID,
          userType: args.userType
        });
        console.log("After calling userService.registerUser");
        if (!result.status || !result.user) {
          return formatResponse(false, null, result.message);
        }
         // This should print something
         console.log("args.userType:", args.userType);

         console.log("Checking doctor conditions:", {
          isUserTypeDoctor: args.userType === 'doctor',
          hasLicenseNo: !!args.licenseRegistrationNo,
          hasQualification: !!args.qualification,
          hasCollege: !!args.collegeName,
          hasCourseYear: !!args.courseYear
        });
        // Step 2: If user is a doctor and has provided doctor details, create doctor profile
        if (args.userType === 'doctor' && 
            args.licenseRegistrationNo && 
            args.qualification && 
            args.collegeName && 
            args.courseYear) {

              console.log("Before calling doctorService.createDoctorDetails");
              console.log("Creating doctor profile...");
          
          const doctorResult = await doctorService.createDoctorDetails(
             args.licenseRegistrationNo,
             args.qualification,
             args.collegeName,
             args.courseYear,
             args.city,
             args.state,
             result.user.ID.toString(),
            result.user.ID.toString()
            );
console.log(doctorResult);
console.log("After calling doctorService.createDoctorDetails:", doctorResult);
          if (!doctorResult.success) {
            return formatResponse(
              true, 
              { user: result.user },
              `User registered successfully but failed to create doctor details: ${doctorResult.error}`
            );
          }

          return formatResponse(
            true,
            {
              user: result.user,
              doctorDetails: doctorResult.data
            },
            "Doctor registered successfully"
          );
        }
        console.log("Completing as regular user registration");
        // Return success for regular user registration
        return formatResponse(
          true,
          { user: result.user },
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

    verifyAndRegisterUser: async (_: unknown, { 
      EmailID,
      mobile_num,
      emailOtp,
      mobileOtp,
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

        const sanitizedUser = {
          ...userData.user,
          ID: userData.user.ID.toString()
        };

        return {
          status: true,
          data: { 
            token: userData.token,
            user: sanitizedUser
          },
          message: "User registered successfully"
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

        const sanitizedUser = {
          ...result.user,
          ID: result.user.ID.toString()
        };

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
