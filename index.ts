import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { typeDefs, resolvers } from "./graphql";
import prisma from "./models/prismaClient";
import redis from "./redis/redisClient";
import { authMiddleware } from "./middlewares/authMiddleware";

dotenv.config();

const app: Application = express();
app.use(cookieParser());
app.use(authMiddleware);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => ({
    req,
    res,
    prisma,
    redis,
  }),
});

const startServer = async () => {
  await server.start();
  server.applyMiddleware({ app: app as any });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
  });
};

startServer();
