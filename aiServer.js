import { ChatOllama } from "@langchain/ollama";
import { RedisChatMessageHistory } from "@langchain/redis";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

//1. 初始化模型 👉 单例（只初始化一次）
const llm = new ChatOllama({
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen2.5:3b",
  temperature: 0.3,
  topP: 0.9,

  frequencyPenalty: 0.5,
  presencePenalty: 0.3,

  maxRetries: 2,
  timeout: 1000 * 60,
});

/**
 * 2. Prompt（带记忆）
 */
const promptWithHistory = ChatPromptTemplate.fromMessages([
  ["system", "你是一个拥有长期记忆的智能助手。"],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

const promptWithoutHistory = ChatPromptTemplate.fromMessages([
  ["system", "你是一个智能助手。"],
  ["human", "{input}"],
]);

/**
 * 3. Redis 历史记录
 */
function getRedisHistory(sessionId) {
  return new RedisChatMessageHistory({
    sessionId,
    sessionTTL: 3600,
    config: {
      url: "redis://localhost:6379",
    },
  });
}

/**
 * 4. 核心调度器（统一入口）
 */
export async function executeChat({ message, sessionId, schema, prompt }) {
  try {
    // ✅ 优先用外部 prompt
    const finalPrompt = prompt
      ? prompt
      : sessionId
        ? promptWithHistory
        : promptWithoutHistory;

    // ✅ 先处理模型
    let model = llm;

    if (schema) {
      model = model.withStructuredOutput(schema);
    }

    const runner = finalPrompt.pipe(model);

    // ✅ 输入
    const input = { input: message };

    // ✅ 带记忆
    if (sessionId) {
      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: runner,
        getMessageHistory: getRedisHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
      });

      const res = await chainWithHistory.invoke(input, {
        configurable: { sessionId },
      });

      return normalizeOutput(res, schema);
    }

    // ✅ 无记忆
    const res = await runner.invoke(input);

    return normalizeOutput(res, schema);
  } catch (err) {
    console.error("❌ executeChat error:", err);
    throw err;
  }
}

/**
 * 5. 输出统一处理
 */
function normalizeOutput(res, schema) {
  if (schema) return res;
  return res?.content ?? res;
}
