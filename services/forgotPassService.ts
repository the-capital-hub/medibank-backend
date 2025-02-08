import prisma from "../models/prismaClient";
import { hashPassword } from "../utils/bcrypt";
import { otpService } from "./otpService";

const normalizeMobileNumber = (EmailIdOrMobile: string): string => {
  const digits = EmailIdOrMobile.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : '';
};

const detectIdentifierType = (EmailIdOrMobile: string): 'email' | 'mobile' => {
  // Check if it's a 10-digit number
  const isMobile = /^\d{10}$/.test(EmailIdOrMobile);
  return isMobile ? 'mobile' : 'email';
};

export const forgotPasswordService = {
    // Initiates the password reset process by sending OTP based on identifier
    async initiatePasswordReset(EmailIdOrMobile: string) {
      try {
        // Normalize and validate mobile number
        const normalizeMobileNumber = (EmailIdOrMobile: string): string => {
          const digits = EmailIdOrMobile.replace(/\D/g, '');
          return digits.length === 10 ? `+91${digits}` : '';
        };
  
        // Check if the identifier is a 10-digit number (mobile)
        const isMobile = /^\d{10}$/.test(EmailIdOrMobile);
        
        // Prepare the query condition based on the identifier type
        const whereClause = isMobile 
          ? { mobile_num: normalizeMobileNumber(EmailIdOrMobile) }
          : { EmailID: EmailIdOrMobile };
  
        // Check if the user exists
        const user = await prisma.userMaster.findUnique({
          where: whereClause
        });
  
        if (!user) {
          throw new Error(`No account found with this ${isMobile ? 'mobile number' : 'email'}`);
        }
  
        let otpResult;
        
        // Send OTP based on identifier type
        if (isMobile) {
          const mobileNumber = normalizeMobileNumber(EmailIdOrMobile);
          if (!mobileNumber) {
            throw new Error('Invalid mobile number format');
          }
          
          otpResult = await otpService.generateAndSendOtp('', mobileNumber);
          if (!otpResult) {
            throw new Error('Failed to send OTP to mobile number');
          }
        } else {
          if (!EmailIdOrMobile || !EmailIdOrMobile.includes('@')) {
            throw new Error('Invalid email format');
          }
          
          otpResult = await otpService.generateAndSendOtp(EmailIdOrMobile, '');
          if (!otpResult) {
            throw new Error('Failed to send OTP to email');
          }
        }
  
        return {
          status: true,
          message: `OTP sent successfully to your ${isMobile ? 'mobile number' : 'email'}`,
          data: {}
        };
  
      } catch (error) {
        console.error("Error in initiatePasswordReset:", error);
        throw new Error("Error initiating password reset. Please try again.");
      }
    },
  
    // Verifies OTP and updates the user's password
    async verifyOtpAndUpdatePassword(
      EmailIdOrMobile: string, 
      otp: string,
      newPassword: string,
      confirmPassword: string
    ) {
  console.log(newPassword, confirmPassword)

      try {
        // Auto-detect type from the identifier format
        const type = detectIdentifierType(EmailIdOrMobile);
        
        console.log('Starting verification with:', {
          EmailIdOrMobile,
          detectedType: type,
          otp
        });
        // Check if the new password and confirm password match
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
  
        // Normalize identifier based on detected type
        const normalizedIdentifier = type === 'mobile' 
          ? normalizeMobileNumber(EmailIdOrMobile)
          : EmailIdOrMobile;
  
        console.log('Normalized identifier:', normalizedIdentifier);
  
        // Verify OTP
        const isValid = type === 'email'
          ? await otpService.verifyEmailOtp(normalizedIdentifier, otp)
          : await otpService.verifyMobileOtp(normalizedIdentifier, otp);
  
        if (!isValid) {
          throw new Error('Invalid OTP');
        }
  
        // Prepare where clause based on detected type
        const whereClause = type === 'mobile'
          ? { mobile_num: normalizedIdentifier }
          : { EmailID: normalizedIdentifier };
  
        console.log('Looking for user with:', whereClause);
  
        // Find user
        const user = await prisma.userMaster.findUnique({
          where: whereClause
        });
  
        console.log('User found:', user ? 'Yes' : 'No');
  
        if (!user) {
          throw new Error(`No user found with this ${type}`);
        }
  
        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
  console.log('Hashed password:', hashedPassword);
        // Update password
        await prisma.userMaster.update({
          where: { ID: user.ID },
          data: { Password: hashedPassword }
        });
  
        return {
          status: true,
          message: 'Password updated successfully'
        };
      } catch (error) {
        console.error("Error in verifyOtpAndUpdatePassword:", error);
        throw new Error( "Error verifying OTP and updating password. Please try again.");
      }
    }
  };
  
