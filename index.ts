import express from "express";
import { ApolloServer } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import { typeDefs, resolvers } from "./schema";
import Redis from "ioredis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

//Initialize Prisma and Redis
const prisma = new PrismaClient();
// const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const redis = new Redis({
    host: "redis-16915.c8.us-east-1-3.ec2.redns.redis-cloud.com:16915",
    port: 6379,
    password: process.env.REDIS_PASSWORD, // Use an environment variable for security
  });

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis Error:", err));

const app = express();
app.use(cookieParser());

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => ({ req, res, prisma, redis }),
})

async function startServer(){
    await server.start();
    server.applyMiddleware({ app: app as any });
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Server listening on port http://localhost:${PORT}/graphql`);
    });
}

startServer();