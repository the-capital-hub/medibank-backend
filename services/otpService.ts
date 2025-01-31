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
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    console.log("Generated OTP:", otp); // Debugging log

    try {
      // Store OTP in Redis with expiration
      await redis.set(`otp:${email}`, otp, "EX", OTP_EXPIRATION_TIME);
      await redis.set(`otp:${mobile}`, otp, "EX", OTP_EXPIRATION_TIME);

      // Send OTP via email and SMS
      await Promise.all([
        this.sendEmailOtp(email, otp),
        this.sendMobileOtp(mobile, otp),
      ]);

    } catch (error) {
      console.error("Error generating or sending OTP:", error);
      throw new Error("Failed to send OTP. Please try again.");
    }

    return { message: "OTP sent successfully" }; // Return confirmation message
  },

  /**
   * Verify OTP for email or mobile
   */
  async verifyOtp(emailOrMobile: string, otp: string) {
    try {
      const storedOtp = await redis.get(`otp:${emailOrMobile}`);
      console.log(`Stored OTP for ${emailOrMobile}:`, storedOtp); // Debugging log

      if (!storedOtp) {
        throw new Error("OTP expired or invalid");
      }
      if (storedOtp !== otp) {
        throw new Error("Invalid OTP");
      }

      // OTP is valid, remove it from Redis
      await redis.del(`otp:${emailOrMobile}`);

      return true;
    } catch (error) {
      console.error(`OTP verification failed for ${emailOrMobile}:`, error);
      throw error;
    }
  },
};
