"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
const user_1 = require("./schemas/user");
const user_2 = require("./resolvers/user");
exports.typeDefs = [user_1.userTypeDefs];
exports.resolvers = [user_2.userResolvers];
