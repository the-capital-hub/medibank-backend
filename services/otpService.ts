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
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password
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
        from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
        to: mobile,
      });
      console.log(`OTP sent to mobile: ${mobile}`);
    } catch (error) {
      console.error(`Failed to send OTP to mobile ${mobile}:`, error);
      throw new Error("Failed to send OTP to mobile. Please try again.");
    }
  },

  /**
   * Generate and send OTP to both email and mobile
   */
  async generateAndSendOtp(email: string, mobile: string) {
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    console.log("Generated OTP for email:", emailOtp); // Debugging log
    const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    console.log("Generated OTP for mobile:", mobileOtp); // Debugging log

    try {
      // Store OTP in Redis with expiration
      await redis.set(`otp:${email}`, emailOtp, "EX", OTP_EXPIRATION_TIME);
      await redis.set(`otp:${mobile}`, mobileOtp, "EX", OTP_EXPIRATION_TIME);

      // Send OTP via email and SMS
      await Promise.all([
        this.sendEmailOtp(email, emailOtp),
        this.sendMobileOtp(mobile, mobileOtp),
      ]);

    } catch (error) {
      console.error("Error generating or sending OTP:", error);
      throw new Error("Failed to send OTP. Please try again.");
    }

    return { message: "OTP sent successfully" }; // Return confirmation message
  },

  /**
   * Verify OTP for email 
   */
  async verifyEmailOtp(email: string, emailOtp: string) {
    try {
      const storedEmailOtp = await redis.get(`otp:${email}`);
      console.log(`Stored OTP for ${email}:`, storedEmailOtp); // Debugging log
  
      if (!storedEmailOtp) {
        throw new Error("Email OTP expired or invalid");
      }
      if (storedEmailOtp !== emailOtp) {
        throw new Error("Invalid email OTP");
      }
  
      // OTP is valid, remove it from Redis
      await redis.del(`otp:${email}`);
  
      return true; // Email OTP is valid
    } catch (error) {
      console.error(`Email OTP verification failed for ${email}:`, error);
      throw error; // Rethrow the error if verification fails
    }
  },

  // Verify OTP for mobile
  async verifyMobileOtp(mobile: string, mobileOtp: string) {
    try {
      const storedMobileOtp = await redis.get(`otp:${mobile}`);
      console.log(`Stored OTP for ${mobile}:`, storedMobileOtp); // Debugging log
  
      if (!storedMobileOtp) {
        throw new Error("Mobile OTP expired or invalid");
      }
      if (storedMobileOtp !== mobileOtp) {
        throw new Error("Invalid mobile OTP");
      }
  
      // OTP is valid, remove it from Redis
      await redis.del(`otp:${mobile}`);
  
      return true; // Mobile OTP is valid
    } catch (error) {
      console.error(`Mobile OTP verification failed for ${mobile}:`, error);
      throw error; // Rethrow the error if verification fails
    }
  }
  
  
};
