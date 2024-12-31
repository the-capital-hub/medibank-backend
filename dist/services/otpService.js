"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = void 0;
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const twilio_1 = __importDefault(require("twilio"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const OTP_EXPIRATION_TIME = 300; // 5 minutes
// Initialize Twilio client
const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Initialize Nodemailer transporter
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password
    },
});
exports.otpService = {
    /**
     * Send OTP via email
     */
    sendEmailOtp(email, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "Your OTP for Email Verification",
                    text: `Your OTP for verification is: ${otp}`,
                });
                console.log(`OTP sent to email: ${email}`);
            }
            catch (error) {
                console.error(`Failed to send OTP to email ${email}:`, error);
                throw new Error("Failed to send OTP to email. Please try again.");
            }
        });
    },
    /**
     * Send OTP via SMS
     */
    sendMobileOtp(mobile, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield twilioClient.messages.create({
                    body: `Your OTP for verification is: ${otp}`,
                    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
                    to: mobile,
                });
                console.log(`OTP sent to mobile: ${mobile}`);
            }
            catch (error) {
                console.error(`Failed to send OTP to mobile ${mobile}:`, error);
                throw new Error("Failed to send OTP to mobile. Please try again.");
            }
        });
    },
    /**
     * Generate and send OTP to both email and mobile
     */
    generateAndSendOtp(email, mobile) {
        return __awaiter(this, void 0, void 0, function* () {
            const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
            console.log("Generated OTP:", otp); // Debugging log
            try {
                // Store OTP in Redis with expiration
                yield redisClient_1.default.set(`otp:${email}`, otp, "EX", OTP_EXPIRATION_TIME);
                yield redisClient_1.default.set(`otp:${mobile}`, otp, "EX", OTP_EXPIRATION_TIME);
                // Send OTP via email and SMS
                yield Promise.all([
                    this.sendEmailOtp(email, otp),
                    this.sendMobileOtp(mobile, otp),
                ]);
                console.log(`OTP sent successfully to email: ${email} and mobile: ${mobile}`);
            }
            catch (error) {
                console.error("Error generating or sending OTP:", error);
                throw new Error("Failed to send OTP. Please try again.");
            }
            return { message: "OTP sent successfully" }; // Return confirmation message
        });
    },
    /**
     * Verify OTP for email or mobile
     */
    verifyOtp(emailOrMobile, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const storedOtp = yield redisClient_1.default.get(`otp:${emailOrMobile}`);
                console.log(`Stored OTP for ${emailOrMobile}:`, storedOtp); // Debugging log
                if (!storedOtp) {
                    throw new Error("OTP expired or invalid");
                }
                if (storedOtp !== otp) {
                    throw new Error("Invalid OTP");
                }
                // OTP is valid, remove it from Redis
                yield redisClient_1.default.del(`otp:${emailOrMobile}`);
                console.log(`OTP verified and deleted for ${emailOrMobile}`);
                return true;
            }
            catch (error) {
                console.error(`OTP verification failed for ${emailOrMobile}:`, error);
                throw error;
            }
        });
    },
};
