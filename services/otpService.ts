import redis from "../redis/redisClient";
import twilio from "twilio";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const OTP_EXPIRATION_TIME = 300; // 5 minutes

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const otpService = {
  /**
   * Send OTP via email
   */
  async sendEmailOtp(email: string, otp: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Email Verification",
        text: `Your OTP for verification is: ${otp}`,
      });
      console.log(`OTP sent to email: ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP to email ${email}:`, error);
      throw new Error("Failed to send OTP to email. Please try again.");
    }
  },

  /**
   * Send OTP via SMS
   */
  async sendMobileOtp(mobile: string, otp: string) {
    try {
      await twilioClient.messages.create({
        body: `Your OTP for verification is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobile,
      });
      console.log(`OTP sent to mobile: ${mobile}`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP to mobile ${mobile}:`, error);
      throw new Error("Failed to send OTP to mobile. Please try again.");
    }
  },

  /**
   * Generate and send OTP based on provided contact method
   */
  async generateAndSendOtp(email: string, mobile: string) {
    try {
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
      const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
      if (email && mobile) {
        // Send OTP to both email and mobile
        console.log("Generated OTP for email:", emailOtp);
        await redis.set(`otp:${email}`, emailOtp, "EX", OTP_EXPIRATION_TIME);
        await this.sendEmailOtp(email, emailOtp);
        
        console.log("Generated OTP for mobile:", mobileOtp);
        await redis.set(`otp:${mobile}`, mobileOtp, "EX", OTP_EXPIRATION_TIME);
        await this.sendMobileOtp(mobile, mobileOtp);
  
        return {
          success: true,
          message: "OTP sent successfully to email and mobile"
        };
      }
      if (email) {
        // Email OTP flow
        console.log("Generated OTP for email:", emailOtp);
        await redis.set(`otp:${email}`, emailOtp, "EX", OTP_EXPIRATION_TIME);
        await this.sendEmailOtp(email, emailOtp);
        return {
          success: true,
          message: "OTP sent successfully to email"
        };
      } 
      else if (mobile) {
        // Mobile OTP flow
        console.log("Generated OTP for mobile:", mobileOtp);
        await redis.set(`otp:${mobile}`, mobileOtp, "EX", OTP_EXPIRATION_TIME);
        await this.sendMobileOtp(mobile, mobileOtp);
        return {
          success: true,
          message: "OTP sent successfully to mobile"
        };
      }
      
      throw new Error("Either email or mobile is required");
    } catch (error) {
      console.error("Error generating or sending OTP:", error);
      return {
        success: false,
        message:  "Failed to send OTP. Please try again."
      };
    }
  },

  /**
   * Verify OTP for email 
   */
  async verifyEmailOtp(email: string, emailOtp: string) {
    try {
      const storedOtp = await redis.get(`otp:${email}`);
      console.log(`Stored OTP for ${email}:`, storedOtp);

      if (!storedOtp) {
        throw new Error("Email OTP expired or invalid");
      }
      if (storedOtp !== emailOtp) {
        throw new Error("Invalid email OTP");
      }

      await redis.del(`otp:${email}`);
      return true;
    } catch (error) {
      console.error(`Email OTP verification failed for ${email}:`, error);
      throw error;
    }
  },

  /**
   * Verify OTP for mobile
   */
  async verifyMobileOtp(mobile: string, mobileOtp: string) {
    try {
      // Ensure mobile number has +91 prefix
      const normalizedMobile = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
      
      // Log the verification attempt with the normalized number
      console.log(`Attempting to verify OTP for mobile: ${normalizedMobile}`);
      
      // Check Redis with the normalized mobile number
      const storedOtp = await redis.get(`otp:${normalizedMobile}`);
      console.log(`Stored OTP for ${normalizedMobile}:`, storedOtp);

      if (!storedOtp) {
        throw new Error("Mobile OTP expired or invalid");
      }
      
      if (storedOtp !== mobileOtp) {
        throw new Error("Invalid mobile OTP");
      }

      // OTP is valid, remove it from Redis
      await redis.del(`otp:${normalizedMobile}`);
      return true;
    } catch (error) {
      console.error(`Mobile OTP verification failed for ${mobile}:`, error);
      throw error;
    }
  }
};
