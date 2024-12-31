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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResolvers = void 0;
const userService_1 = require("../../services/userService");
exports.userResolvers = {
    Query: {
        me: (_1, __1, _a) => __awaiter(void 0, [_1, __1, _a], void 0, function* (_, __, { req }) {
            const userId = req.user;
            if (!userId)
                return null;
            return userService_1.userService.getUserById(userId);
        }),
    },
    Mutation: {
        register: (_1, args_1, _a) => __awaiter(void 0, [_1, args_1, _a], void 0, function* (_, args, { redis }) {
            try {
                console.log("Register mutation args:", args);
                const result = yield userService_1.userService.registerUser(args, redis);
                console.log("User service result:", result);
                return result.message;
            }
            catch (error) {
                console.error("Error in register resolver:", error);
                throw new Error("Failed to send OTP. Please try again.");
            }
        }),
        sendRegistrationOtp: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { EmailID, MobileNo }, { redis }) {
            return userService_1.userService.registerUser({ EmailID, MobileNo }, redis);
        }),
        verifyAndRegisterUser: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { EmailID, MobileNo, OTP }, { redis }) {
            return userService_1.userService.verifyAndCreateUser(EmailID, MobileNo, OTP);
        }),
        login: (_1, args_1, _a) => __awaiter(void 0, [_1, args_1, _a], void 0, function* (_, args, { redis, res }) { return userService_1.userService.loginUser(args, redis, res); }),
    },
};
