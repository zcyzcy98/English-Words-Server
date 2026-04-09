import express from "express";
import ollama from "ollama";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

import { executeChat } from "../aiServer.js";

// 创建路由器
const router = express.Router();

// 创建 Prisma 客户端
const prisma = new PrismaClient();

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
    const data = await executeChat({ message: prompt, sessionId: userIp });

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

// ai生成名言
router.get("/generate/quote", async (req, res) => {
  const prompt =
    "请帮我搜集1句关于英文名言，尽量挑选那些能够引发共鸣、具有深刻洞见的句子。";
  // 定义一个“名言”的模具
  const QuoteSchema = z.object({
    content: z.string().min(5), // 必须是字符串，且最少5个字符
    author: z.string(), // 必须是字符串
    translation: z.string(), // 可选的字符串
  });

  const quote = await executeChat({ message: prompt, schema: QuoteSchema });
  res.json(quote);
});

export default router;
