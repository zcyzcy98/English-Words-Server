import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing.js";

import express from "express";
import cors from "cors";

// 引入路由
// const wordActions = require("./actions/wordActions");
// const quoteActions = require("./actions/quoteActions");
import wordActions from "./actions/wordActions.js";
import quoteActions from "./actions/quoteActions.js";
import checkInActions from "./actions/checkInActions.js";
import aiActions from "./actions/aiActions.js";

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
  }),
);

// 注册路由
app.use("/api/words", wordActions);
app.use("/api/quotes", quoteActions);
app.use("/api/checkIn", checkInActions);
app.use("/api/ai", aiActions);

// 启动服务器
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
