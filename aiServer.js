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

// 2. 设计 Prompt：必须包含一个 MessagesPlaceholder 来承接 Redis 里的历史记录
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个拥有长期记忆的智能助手。"],
  new MessagesPlaceholder("chat_history"), // 这里的名字要和后面 historyMessagesKey 对应
  ["human", "{input}"],
]);

const chain = prompt.pipe(llm);

// 3. 封装带 Redis 的执行链
const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  // 关键函数：LangChain 每次调用都会通过 sessionId 去 Redis 查记录
  getMessageHistory: (sessionId) =>
    new RedisChatMessageHistory({
      sessionId: sessionId,
      sessionTTL: 3600, // 自动设置过期时间（秒），1小时后自动清理
      config: {
        url: "redis://localhost:6379", // 你的 Redis 地址
      },
    }),
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history", // 对应上面 Placeholder 的变量名
});

export { chainWithHistory };

// 👉 通用问答
// export async function chat(message) {
//   const res = await llm.invoke(message);

//   console.log("LLM RESULT:", res);

//   return res.content;
// }

export async function chat(message, sessionId) {
  try {
    // 调用带记忆的链，而不是直接调用 llm
    const res = await chainWithHistory.invoke(
      { input: message }, 
      { configurable: { sessionId: sessionId } }
    );

    console.log(`[Session: ${sessionId}] LLM RESULT:`, res.content);

    return res.content;
  } catch (error) {
    console.error("对话失败:", error);
    throw error;
  }
}

// ✅ 流式调用（重点）
export async function chatStream(message) {
  const stream = await llm.stream(message);
  return stream;
}
