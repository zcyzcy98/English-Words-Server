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

// 创建 Express 应用
const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
  })
);

// 注册路由
app.use("/api/words", wordActions);
app.use("/api/quotes", quoteActions);
app.use("/api/checkIn", checkInActions);

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
