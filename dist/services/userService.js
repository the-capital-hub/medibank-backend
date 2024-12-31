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
exports.userService = void 0;
const prismaClient_1 = __importDefault(require("../models/prismaClient"));
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const bcrypt_1 = require("../utils/bcrypt");
const jwt_1 = require("../utils/jwt");
const otpService_1 = require("./otpService");
// Utility to handle BigInt serialization in JSON
function safeStringify(obj) {
    return JSON.stringify(obj, (_, value) => typeof value === "bigint" ? value.toString() : value);
}
// Restore BigInt values from JSON-parsed objects
function restoreBigInt(obj) {
    if (obj && typeof obj === "object") {
        for (const key in obj) {
            if (typeof obj[key] === "string" && /^\d+$/.test(obj[key])) {
                obj[key] = BigInt(obj[key]);
            }
        }
    }
    return obj;
}
exports.userService = {
    /**
     * Registers a new user by sending OTPs to email and mobile.
     * Temporarily stores user details in Redis until OTP verification.
     */
    registerUser(_a, redisClient_2) {
        return __awaiter(this, arguments, void 0, function* ({ EmailID, Password, FirstName, LastName, MobileNo, UserType }, redisClient) {
            if (!EmailID || !Password || !FirstName || !MobileNo || !UserType) {
                throw new Error("Missing required fields for user registration.");
            }
            // Check if the email is already registered
            const existingUser = yield prismaClient_1.default.userMaster.findUnique({ where: { EmailID } });
            if (existingUser) {
                throw new Error("A user with this email already exists.");
            }
            // Generate and send OTP
            yield otpService_1.otpService.generateAndSendOtp(EmailID, MobileNo);
            // Temporarily store user details in Redis
            const userData = { EmailID, Password, FirstName, LastName, MobileNo, UserType };
            yield redisClient.set(`user:temp:${EmailID}`, JSON.stringify(userData), "EX", 600); // Expire in 10 minutes
            return { message: "OTP sent to email and mobile. Please verify." };
        });
    },
    /**
     * Verifies OTP and creates a new user in the database.
     */
    verifyAndCreateUser(email, mobile, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify OTPs
            yield otpService_1.otpService.verifyOtp(email, otp);
            yield otpService_1.otpService.verifyOtp(mobile, otp);
            // Retrieve temporary user data from Redis
            const userDataJson = yield redisClient_1.default.get(`user:temp:${email}`);
            if (!userDataJson) {
                throw new Error("User data expired. Please register again.");
            }
            const userData = JSON.parse(userDataJson);
            const hashedPassword = yield (0, bcrypt_1.hashPassword)(userData.Password);
            // Create user in the database
            const user = yield prismaClient_1.default.userMaster.create({
                data: {
                    EmailID: userData.EmailID,
                    Password: hashedPassword,
                    FirstName: userData.FirstName,
                    LastName: userData.LastName,
                    MobileNo: userData.MobileNo,
                    MBID: `MB${Math.random().toString().slice(2, 10)}`,
                    UserType: userData.UserType,
                },
            });
            // Generate token
            const token = (0, jwt_1.generateToken)({ userId: user.ID.toString() });
            // Remove temporary user data from Redis
            yield redisClient_1.default.del(`user:temp:${email}`);
            return { token, user };
        });
    },
    /**
     * Logs in a user, validates credentials, and returns a JWT token.
     */
    loginUser(_a, redisClient_2, res_1) {
        return __awaiter(this, arguments, void 0, function* ({ EmailID, Password }, redisClient, res) {
            if (!EmailID || !Password) {
                throw new Error("EmailID and Password are required.");
            }
            const cacheKey = `user:${EmailID}`;
            let user;
            // Check Redis cache for user data
            const cachedUser = yield redisClient.get(cacheKey);
            if (cachedUser) {
                user = restoreBigInt(JSON.parse(cachedUser));
            }
            else {
                // Fetch user from the database if not cached
                user = yield prismaClient_1.default.userMaster.findUnique({ where: { EmailID } });
                if (!user) {
                    throw new Error("User not found.");
                }
                yield redisClient.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
            }
            // Validate password
            const isValid = yield (0, bcrypt_1.comparePassword)(Password, user.Password);
            if (!isValid) {
                throw new Error("Invalid credentials.");
            }
            // Generate and set token
            const token = (0, jwt_1.generateToken)({ userId: user.ID.toString() });
            res.cookie("token", token, { httpOnly: true });
            return { token, user };
        });
    },
    /**
     * Retrieves a user by their ID, using Redis for caching.
     */
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `user:${userId}`;
            let user;
            // Check Redis cache for user data
            const cachedUser = yield redisClient_1.default.get(cacheKey);
            if (cachedUser) {
                user = restoreBigInt(JSON.parse(cachedUser));
            }
            else {
                // Fetch user from the database if not cached
                user = yield prismaClient_1.default.userMaster.findUnique({ where: { ID: BigInt(userId) } });
                if (user) {
                    yield redisClient_1.default.set(cacheKey, safeStringify(user), "EX", 3600); // Cache for 1 hour
                }
            }
            return user;
        });
    },
};
