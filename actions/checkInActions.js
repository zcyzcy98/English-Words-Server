import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// 徽章规则定义
const BADGE_RULES = [
  { id: "total_1", name: "新手上路", type: "total", days: 1, icon: "🌱" },
  { id: "total_30", name: "坚持不懈", type: "total", days: 30, icon: "💪" },
  { id: "total_100", name: "学习达人", type: "total", days: 100, icon: "🌟" },
  { id: "total_365", name: "年度学霸", type: "total", days: 365, icon: "🏆" },
  { id: "consecutive_7", name: "周冠军", type: "consecutive", days: 7, icon: "🔥" },
  { id: "consecutive_30", name: "月冠军", type: "consecutive", days: 30, icon: "👑" },
  { id: "consecutive_100", name: "百日王者", type: "consecutive", days: 100, icon: "💎" },
];

// 检查并更新徽章
function checkBadges(stats) {
  console.log("stats:", stats);
  const newBadges = [...stats.badges];

  BADGE_RULES.forEach((rule) => {
    if (!newBadges.includes(rule.id)) {
      const days = rule.type === "total" ? stats.totalDays : stats.consecutiveDays;
      if (days >= rule.days) {
        newBadges.push(rule.id);
      }
    }
  });

  return newBadges;
}

// 获取今天的日期（去掉时分秒）
function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// 判断两个日期是否是连续的（相差一天）
function isConsecutive(lastDate, today) {
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays === 1;
}

// 判断是否是同一天
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ============ 签到 ============
// POST /api/checkIn
router.post("/", async (req, res) => {
  try {
    const today = getToday();

    // 检查今天是否已签到
    const existingCheckIn = await prisma.checkIn.findUnique({
      where: { date: today },
    });

    if (existingCheckIn) {
      return res.status(400).json({
        error: "今天已经签到过了",
        alreadyCheckedIn: true,
      });
    }

    // 获取或创建签到统计
    let stats = await prisma.checkInStats.findFirst();
    if (!stats) {
      stats = await prisma.checkInStats.create({ data: {} });
    }

    // 计算连续签到天数
    let newConsecutiveDays = 1;
    if (stats.lastCheckIn) {
      const lastDate = new Date(stats.lastCheckIn);
      lastDate.setHours(0, 0, 0, 0);

      if (isConsecutive(lastDate, today)) {
        newConsecutiveDays = stats.consecutiveDays + 1;
      }
    }

    // 更新统计
    const newTotalDays = stats.totalDays + 1;

    // 临时统计对象用于检查徽章
    const tempStats = {
      totalDays: newTotalDays,
      consecutiveDays: newConsecutiveDays,
      badges: stats.badges,
    };
    const newBadges = checkBadges(tempStats);

    // 使用事务同时创建签到记录和更新统计
    const [checkIn, updatedStats] = await prisma.$transaction([
      prisma.checkIn.create({
        data: { date: today },
      }),
      prisma.checkInStats.update({
        where: { id: stats.id },
        data: {
          totalDays: newTotalDays,
          consecutiveDays: newConsecutiveDays,
          lastCheckIn: today,
          badges: newBadges,
        },
      }),
    ]);

    // 检查是否获得新徽章
    const earnedBadges = newBadges
      .filter((b) => !stats.badges.includes(b))
      .map((id) => BADGE_RULES.find((r) => r.id === id));

    res.json({
      message: "签到成功",
      data: {
        date: checkIn.date,
        totalDays: updatedStats.totalDays,
        consecutiveDays: updatedStats.consecutiveDays,
        earnedBadges, // 本次签到获得的新徽章
      },
    });
  } catch (error) {
    console.error("签到失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});

// ============ 获取签到状态 ============
// GET /api/checkIn/stats
router.get("/stats", async (req, res) => {
  try {
    const today = getToday();

    // 获取统计
    let stats = await prisma.checkInStats.findFirst();
    if (!stats) {
      stats = await prisma.checkInStats.create({ data: {} });
    }

    // 检查今天是否已签到
    const todayCheckIn = await prisma.checkIn.findUnique({
      where: { date: today },
    });

    // 检查连续签到是否已断
    let currentConsecutive = stats.consecutiveDays;
    if (stats.lastCheckIn) {
      const lastDate = new Date(stats.lastCheckIn);
      lastDate.setHours(0, 0, 0, 0);

      if (!isSameDay(lastDate, today) && !isConsecutive(lastDate, today)) {
        currentConsecutive = 0;
      }
    }

    // 获取徽章详情
    const badgeDetails = stats.badges.map((id) =>
      BADGE_RULES.find((r) => r.id === id)
    );

    res.json({
      totalDays: stats.totalDays,
      consecutiveDays: currentConsecutive,
      lastCheckIn: stats.lastCheckIn,
      todayCheckIn: !!todayCheckIn,
      badges: badgeDetails,
      allBadges: BADGE_RULES, // 所有可获得的徽章
    });
  } catch (error) {
    console.error("获取签到状态失败:", error);
    res.status(500).json({
      error: "服务器错误",
      detail: error.message,
    });
  }
});


export default router;