import express from "express";
import ollama from "ollama";
import { PrismaClient } from "@prisma/client";

// 创建路由器
const router = express.Router();

// 创建 Prisma 客户端
const prisma = new PrismaClient();

router.post("/chat", async (req, res) => {
  const { prompt, userId } = req.body;

  // 1. 设置响应头，告知浏览器这是一个流式响应
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // 1. 调用模型
    const response = await ollama.generate({
      model: "qwen3.5:0.8b",
      prompt: prompt,
      stream: true, // 必须为 true
    });

    // 3. 遍历异步生成器
    for await (const part of response) {

      console.log(part);
      // 直接将内容写入响应流
      // 注意：ollama 的流返回的是对象 { model:..., response: 'xxx', ... }
      res.write(part.response);
    }

    // 4. 结束响应
    res.end();
  } catch (error) {
    console.error("Streaming error:", error);
    res.end(); // 报错也要结束流，防止前端一直挂起
  }
});

export default router;
