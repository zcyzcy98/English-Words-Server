import express from "express";
import ollama from "ollama";
import { PrismaClient } from "@prisma/client";

import { chat, chatStream } from "../aiServer.js";

// 创建路由器
const router = express.Router();

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// router.post("/chat", async (req, res) => {
//   const { prompt, userId } = req.body;

//   // 1. 设置响应头，告知浏览器这是一个流式响应
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   try {
//     // 1. 调用模型
//     const response = await ollama.generate({
//       model: "qwen3.5:0.8b",
//       prompt: prompt,
//       stream: true, // 必须为 true
//     });

//     // 3. 遍历异步生成器
//     for await (const part of response) {
//       console.log(part);
//       // 直接将内容写入响应流
//       // 注意：ollama 的流返回的是对象 { model:..., response: 'xxx', ... }
//       res.write(part.response);
//     }

//     // 4. 结束响应
//     res.end();
//   } catch (error) {
//     console.error("Streaming error:", error);
//     res.end(); // 报错也要结束流，防止前端一直挂起
//   }
// });

// 👉 通用聊天接口
router.post("/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log(prompt);

  // 获取ip作为sessionId
  const userIp = req.ip;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: "prompt is required",
    });
  }

  try {
    const data = await chat(prompt, userIp);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ✅ 流式接口
router.post("/chat/stream", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: "prompt is required",
    });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await chatStream(prompt);

    for await (const chunk of stream) {
      res.write(chunk.content || "");
    }

    res.end();
  } catch (err) {
    res.end("error: " + err.message);
  }
});

export default router;
