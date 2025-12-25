import express from "express";
import { PrismaClient } from "@prisma/client";

// 创建路由器
const router = express.Router();

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// ============ 获取所有英文名句 ============
// GET /api/quotes?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quote.count(),
    ]);

    res.json({
      data: quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取名句列表失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 新增精美英文短句 ============
// POST /api/add/quote
router.post("/addQuote", async (req, res) => {
  try {
    const { content, translation, imageUrl, author } = req.body;

    // 参数校验
    if (!content || !translation || !imageUrl) {
      return res.status(400).json({
        error: "短句内容、翻译和图片链接都是必填项",
      });
    }

    // 创建新短句
    const newQuote = await prisma.quote.create({
      data: {
        content,
        translation,
        imageUrl,
        author,
      },
    });

    res.status(201).json({
      message: "短句添加成功",
      data: newQuote,
    });
  } catch (error) {
    console.error("添加短句失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 获取随机一条名句 ============
// GET /api/quotes/random
router.get("/random", async (req, res) => {
  try {
    // 获取总数
    const count = await prisma.quote.count();

    if (count === 0) {
      return res.json({ data: [] });
    }

    // 随机偏移
    const randomIndex = Math.floor(Math.random() * count);

    const quote = await prisma.quote.findFirst({
      skip: randomIndex,
    });

    res.json({ data: quote });
  } catch (error) {
    console.error("获取随机名句失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 更新名句 ============
// PUT /api/quotes/updateQuote/:id
router.put("/updateQuote/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { content, translation, imageUrl, author } = req.body;

    if (!content || !translation || !imageUrl) {
      return res.status(400).json({
        error: "短句内容、翻译和图片链接都是必填项",
      });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: { content, translation, imageUrl, author },
    });

    res.json({
      message: "更新成功",
      data: updatedQuote,
    });
  } catch (error) {
    console.error("更新名句失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 删除名句 ============
// DELETE /api/quotes/deleteQuote/:id
router.delete("/deleteQuote/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.quote.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除名句失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

export default router;
