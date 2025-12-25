# English Learning Server

英语学习应用后端服务，基于 Express + Prisma + PostgreSQL 构建。

## 技术栈

- **Express.js** - Web 框架
- **Prisma** - ORM 数据库工具
- **PostgreSQL** - 数据库 (Neon)
- **UploadThing** - 文件上传服务

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL='postgresql://username:password@host/database?sslmode=require'
UPLOADTHING_TOKEN='your_uploadthing_token'
```

### 3. 同步数据库

```bash
npx prisma db push
```

### 4. 启动服务

```bash
pnpm dev
```

服务运行在 `http://localhost:3001`

---

## API 接口文档

### 单词模块 `/api/words`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取所有单词（分页） |
| POST | `/addWord` | 新增单词 |
| PUT | `/updateWord/:id` | 更新单词 |
| DELETE | `/deleteWord/:id` | 删除单词 |
| GET | `/stats` | 获取统计信息 |
| GET | `/review` | 获取今日待复习单词 |
| POST | `/review/:id` | 更新复习状态 |
| GET | `/review-stats/:year` | 获取年度复习统计 |

#### 获取所有单词
```
GET /api/words?page=1&limit=10
```

**响应：**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### 新增单词
```
POST /api/words/addWord
```

**请求体：**
```json
{
  "word": "hello",
  "meaning": "你好",
  "phonetic": "/həˈloʊ/",
  "partOfSpeech": ["int.", "n."],
  "category": ["日常用语"],
  "example": "Hello, how are you?",
  "notes": "常用问候语"
}
```

#### 更新复习状态
```
POST /api/words/review/:id
```

**请求体：**
```json
{
  "remembered": true
}
```

基于艾宾浩斯遗忘曲线自动计算下次复习时间，间隔为：1, 2, 4, 7, 15, 30, 60 天。

---

### 名句模块 `/api/quotes`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取所有名句（分页） |
| POST | `/addQuote` | 新增名句 |
| PUT | `/updateQuote/:id` | 更新名句 |
| DELETE | `/deleteQuote/:id` | 删除名句 |
| GET | `/random` | 获取随机一条名句 |

#### 新增名句
```
POST /api/quotes/addQuote
```

**请求体：**
```json
{
  "content": "The only way to do great work is to love what you do.",
  "translation": "成就伟大事业的唯一方法就是热爱你所做的事。",
  "author": "Steve Jobs",
  "imageUrl": "https://example.com/image.jpg"
}
```

---

### 签到模块 `/api/checkIn`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 签到 |
| GET | `/stats` | 获取签到状态 |
| GET | `/calendar/:year/:month` | 获取月度签到日历 |

#### 签到
```
POST /api/checkIn
```

**响应：**
```json
{
  "message": "签到成功",
  "data": {
    "date": "2025-12-25T00:00:00.000Z",
    "totalDays": 10,
    "consecutiveDays": 5,
    "earnedBadges": []
  }
}
```

#### 获取签到状态
```
GET /api/checkIn/stats
```

**响应：**
```json
{
  "totalDays": 10,
  "consecutiveDays": 5,
  "lastCheckIn": "2025-12-25T00:00:00.000Z",
  "todayCheckIn": true,
  "badges": [...],
  "allBadges": [...]
}
```

#### 徽章系统

| 徽章 | 条件 |
|------|------|
| 🌱 新手上路 | 累计签到 7 天 |
| 💪 坚持不懈 | 累计签到 30 天 |
| 🌟 学习达人 | 累计签到 100 天 |
| 🏆 年度学霸 | 累计签到 365 天 |
| 🔥 周冠军 | 连续签到 7 天 |
| 👑 月冠军 | 连续签到 30 天 |
| 💎 百日王者 | 连续签到 100 天 |

---

### 文件上传 `/api/uploadthing`

使用 UploadThing 服务进行图片上传，支持最大 4MB 的图片文件。

---

## 数据库模型

### Word (单词)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| word | String | 单词 |
| phonetic | String? | 音标 |
| partOfSpeech | String[] | 词性 |
| meaning | String | 中文释义 |
| category | String[] | 分类 |
| example | String? | 例句 |
| notes | String? | 笔记 |
| nextReviewDate | DateTime | 下次复习日期 |
| reviewCount | Int | 复习次数 |
| familiarity | Int | 熟悉度 (0-7) |

### Quote (名句)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| content | String | 英文内容 |
| translation | String | 中文翻译 |
| author | String | 作者 |
| imageUrl | String | 图片链接 |

### CheckIn (签到记录)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| date | DateTime | 签到日期（唯一） |

### CheckInStats (签到统计)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| totalDays | Int | 累计签到天数 |
| consecutiveDays | Int | 连续签到天数 |
| lastCheckIn | DateTime? | 最后签到日期 |
| badges | String[] | 获得的徽章 |

---

## 项目结构

```
server/
├── actions/
│   ├── wordActions.js      # 单词相关接口
│   ├── quoteActions.js     # 名句相关接口
│   └── checkInActions.js   # 签到相关接口
├── prisma/
│   └── schema.prisma       # 数据库模型定义
├── server.js               # 主入口文件
├── uploadthing.js          # 文件上传配置
├── .env                    # 环境变量
└── package.json
```

---

## 常用命令

```bash
# 启动开发服务器
pnpm dev

# 同步数据库结构
npx prisma db push

# 生成 Prisma Client
npx prisma generate

# 打开 Prisma Studio
npx prisma studio
```