import express from "express";
import { PrismaClient } from "@prisma/client";

// 创建路由器
const router = express.Router();

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// ============ 获取所有单词 ============
// GET /api/words?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [words, total] = await Promise.all([
      prisma.word.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.word.count(),
    ]);

    res.json({
      data: words,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取单词列表失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 新增单词 ============
// POST /api/words
router.post("/addWord", async (req, res) => {
  try {
    // 1. 从请求体中获取数据
    const { word, meaning, example, phonetic, notes, partOfSpeech, category } =
      req.body;

    // 2. 参数校验
    if (!word || !meaning) {
      return res.status(400).json({
        error: "单词和释义是必填项",
      });
    }

    // 3. 使用 Prisma 创建新单词
    const newWord = await prisma.word.create({
      data: {
        word,
        meaning,
        example,
        phonetic,
        notes,
        partOfSpeech: partOfSpeech || [],
        category,
      },
    });

    // 4. 返回成功
    res.status(200).json({
      message: "单词添加成功",
      data: newWord,
    });
  } catch (error) {
    console.error("添加单词失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 删除单词 ============
// DELETE /api/words/deleteWord/:id
router.delete("/deleteWord/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.word.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除单词失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 更新单词 ============
// PUT /api/words/updateWord/:id
router.put("/updateWord/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { word, meaning, example, phonetic, notes, partOfSpeech, category } = req.body;

    if (!word || !meaning) {
      return res.status(400).json({
        error: "单词和释义是必填项",
      });
    }

    const updatedWord = await prisma.word.update({
      where: { id: parseInt(id) },
      data: { word, meaning, example, phonetic, notes, partOfSpeech, category },
    });

    res.json({
      message: "更新成功",
      data: updatedWord,
    });
  } catch (error) {
    console.error("更新单词失败:", error);  
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 获取统计信息 ============
// GET /api/words/stats
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 今天开始时间（0点0分0秒）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 并行查询，提高效率
    const [totalWords, todayReview, todayReviewed, todayAdded] =
      await Promise.all([
        // 单词总数
        prisma.word.count(),
        // 今日待复习数量
        prisma.word.count({
          where: {
            nextReviewDate: { lte: today },
          },
        }),
        // 今日已复习数量（从复习历史表统计）
        prisma.reviewHistory.count({
          where: {
            reviewedAt: {
              gte: todayStart,
              lte: today,
            },
          },
        }),
        // 今日添加单词数量
        prisma.word.count({
          where: {
            createdAt: {
              gte: todayStart,
              lte: today,
            },
          },
        }),
      ]);

    res.json({
      totalWords, // 单词总数
      todayReview, // 今日待复习数量
      todayReviewed, // 今日已复习数量
      todayAdded, // 今日添加数量
    });
  } catch (error) {
    console.error("获取统计失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 获取今日待复习单词 ============
// GET /api/words/review
router.get("/review", async (req, res) => {
  try {
    // 获取今天的日期（只要年月日，去掉时分秒）
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 设为今天结束时间

    // 查询 nextReviewDate <= 今天 的单词
    const words = await prisma.word.findMany({
      where: {
        nextReviewDate: {
          lte: today, // lte = less than or equal (小于等于)
        },
      },
      orderBy: [
        { familiarity: "asc" }, // 熟悉度低的优先
        { reviewCount: "asc" }, // 复习次数少的优先
      ],
    });

    res.json({
      count: words.length,
      data: words,
    });
  } catch (error) {
    console.error("获取待复习单词失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 更新复习状态 ============
// POST /api/words/review/:id
// body: { remembered: true/false }
router.post("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { remembered } = req.body; // true: 记住了, false: 没记住

    // 1. 查询当前单词
    const word = await prisma.word.findUnique({
      where: { id: parseInt(id) },
    });

    if (!word) {
      return res.status(404).json({ error: "单词不存在" });
    }

    // 2. 计算新的熟悉度和下次复习时间
    let newFamiliarity = word.familiarity;
    let daysToAdd = 1;

    // 艾宾浩斯遗忘曲线间隔: 1, 2, 4, 7, 15, 30, 60 天
    const intervals = [1, 2, 4, 7, 15, 30, 60];

    if (remembered) {
      // 记住了 → 熟悉度+1，按曲线延长复习间隔
      newFamiliarity = Math.min(word.familiarity + 1, 7);
      daysToAdd = intervals[newFamiliarity] || 60;
    } else {
      // 没记住 → 熟悉度-1，明天继续复习
      newFamiliarity = Math.max(word.familiarity - 1, 0);
      daysToAdd = 1;
    }

    // 3. 计算下次复习日期
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

    // 4. 使用事务同时更新单词和创建复习历史
    const [updatedWord] = await prisma.$transaction([
      // 更新单词
      prisma.word.update({
        where: { id: parseInt(id) },
        data: {
          familiarity: newFamiliarity,
          reviewCount: word.reviewCount + 1,
          nextReviewDate: nextReviewDate,
          lastReviewedAt: new Date(),
        },
      }),
      // 创建复习历史记录
      prisma.reviewHistory.create({
        data: {
          wordId: parseInt(id),
          remembered: remembered,
        },
      }),
    ]);

    res.json({
      message: "复习状态已更新",
      data: {
        familiarity: newFamiliarity,
        nextReviewDate: nextReviewDate,
        reviewCount: updatedWord.reviewCount,
      },
    });
  } catch (error) {
    console.error("更新复习状态失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 获取一年每日复习统计 ============
// GET /api/words/review-stats/:year
router.get("/review-stats/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();

    // 计算年份的开始和结束时间
    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // 从复习历史表查询该年所有复习记录
    const reviews = await prisma.reviewHistory.findMany({
      where: {
        reviewedAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: {
        reviewedAt: true,
      },
    });

    // 按日期分组统计
    const dailyStats = {};
    let total = 0;

    reviews.forEach((record) => {
      // 格式化为 YYYY-MM-DD
      const dateKey = record.reviewedAt.toISOString().split("T")[0];
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
      total++;
    });

    res.json({
      year,
      total, // 全年总复习次数
      activeDays: Object.keys(dailyStats).length, // 有复习记录的天数
      data: dailyStats, // { "2025-01-01": 5, "2025-01-02": 10, ... }
    });
  } catch (error) {
    console.error("获取年度复习统计失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

export default router;
