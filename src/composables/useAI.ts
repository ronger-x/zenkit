import { ref } from "vue";
import { usePetStore } from "@/stores/pet";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

/**
 * 回退的 fetch 调用（当 AI SDK 不兼容时使用）
 */
async function fallbackFetch(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: ModelMessage[]
): Promise<string> {
  console.log("🔄 Using fallback fetch for:", model);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.8,
      max_tokens: 500, // 增加限制，推理模型需要更多 token
      stream: false, // 使用非流式，更兼容
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  // 调试：打印完整的响应结构
  console.log("📦 API Response message:", JSON.stringify(message, null, 2));
  
  // 尝试多种响应格式：
  // 1. 标准格式: message.content（优先）
  // 2. 某些模型可能用 message.text
  // 注意：reasoning_content 是推理过程，不是最终回复，不应该作为回复内容
  let content = message?.content;
  
  // 如果 content 是空字符串，也尝试其他字段
  if (!content && content !== "") {
    if (message?.text) {
      console.log("🔄 Using text from response");
      content = message.text;
    }
  }
  
  // 如果还是没有内容，记录警告但不使用 reasoning_content
  // reasoning_content 是推理模型的思考过程，不适合作为回复
  if (!content) {
    console.warn("⚠️ No content in response. Available fields:", Object.keys(message || {}));
    if (message?.reasoning_content) {
      console.warn("⚠️ Found reasoning_content but not using it (it's thinking process, not final answer)");
      // 仍然使用它作为最后的备选，但提示用户
      content = message.reasoning_content;
    }
  }
  
  if (!content) {
    console.error("❌ Unexpected API response:", data);
    throw new Error("API 返回格式异常");
  }
  
  return content;
}

/**
 * AI 对话服务的组合式函数
 * 使用 Vercel AI SDK 处理交互
 */
export function useAI() {
  const petStore = usePetStore();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 发送消息给 AI
   */
  const chat = async (userMessage: string): Promise<string> => {
    if (!petStore.aiConfig.apiKey && petStore.aiConfig.provider !== "ollama") {
      error.value = "请先配置 API Key";
      petStore.say("API Key 还没配置呢~");
      return "";
    }

    isLoading.value = true;
    error.value = null;
    petStore.setState("thinking");
    petStore.say("让我想想...");

    try {
      // 构建消息历史
      const messages: ModelMessage[] = [
        {
          role: "system",
          content: petStore.config.personality,
        },
        // 添加最近的几条对话记录（保持上下文）
        ...petStore.chatHistory.slice(-6).map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ];

      // 记录用户消息
      petStore.addMessage("user", userMessage);

      console.log("🤖 Calling AI with SDK...");
      
      const { provider, apiKey, baseUrl, model } = petStore.aiConfig;
      
      // 规范化 Base URL，处理 undefined 情况
      let apiBaseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, "");
      
      // 特殊处理 Ollama
      if (provider === 'ollama') {
        // 如果是默认地址，自动添加 /v1
        if (apiBaseUrl === 'http://localhost:11434') {
          apiBaseUrl = 'http://localhost:11434/v1';
        } else if (!apiBaseUrl.endsWith('/v1')) {
           // 尝试智能判断，如果用户没加 /v1 且不是 /api/chat 这种，可能需要加
           // 这里简单处理：如果是 ollama 且不含 v1，尝试加上
           apiBaseUrl = `${apiBaseUrl}/v1`;
        }
      }

      // 创建 OpenAI 客户端 (兼容 DeepSeek, Ollama 等)
      const openai = createOpenAI({
        baseURL: apiBaseUrl,
        apiKey: apiKey || 'not-needed',
      });

      console.log("🤖 Creating AI model:", model, "at", apiBaseUrl);

      let fullResponse = "";
      let hasReceivedContent = false;
      
      try {
        // 尝试使用 AI SDK 流式调用
        const result = streamText({
          model: openai(model),
          messages,
          temperature: 0.8,
          maxOutputTokens: 150,
        });

        for await (const textPart of result.textStream) {
          // 跳过空值，但继续处理后续数据
          if (textPart === null || textPart === undefined) {
            console.log("🔄 Received null/undefined chunk, skipping...");
            continue;
          }
          
          // 空字符串也跳过，但不中断
          if (textPart === "") {
            console.log("🔄 Received empty chunk, skipping...");
            continue;
          }
          
          hasReceivedContent = true;
          fullResponse += textPart;
          petStore.updateBubble(fullResponse);
        }
        
        // 如果流式读取完成但没有内容，尝试获取最终文本
        if (!hasReceivedContent || !fullResponse) {
          console.log("⚠️ No content from stream, trying to get final text...");
          const finalText = await result.text;
          if (finalText) {
            fullResponse = finalText;
            petStore.updateBubble(fullResponse);
          }
        }
      } catch (sdkError) {
        console.warn("⚠️ AI SDK failed, falling back to fetch:", sdkError);
        
        // 回退到原生 fetch 调用
        fullResponse = await fallbackFetch(apiBaseUrl, apiKey, model, messages);
        if (fullResponse) {
          petStore.updateBubble(fullResponse);
        } else {
          throw sdkError;
        }
      }
      
      // 最终检查
      if (!fullResponse) {
        throw new Error("未能获取 AI 响应");
      }

      console.log("🤖 AI Response:", fullResponse);

      // 记录 AI 回复
      petStore.addMessage("assistant", fullResponse);

      // 显示回复 (触发 TTS)
      petStore.say(fullResponse, 8000);

      return fullResponse;
    } catch (err: unknown) {
      console.error("❌ AI Error:", err);
      
      // 更友好的错误处理
      let errorMessage = "发生未知错误";
      
      // 尝试从各种错误格式中提取信息
      const errObj = err as Record<string, unknown>;
      const errMessage = err instanceof Error 
        ? err.message 
        : (errObj?.message as string) || String(err);
      
      // 检查是否是 API 返回的结构化错误
      const apiError = errObj?.cause as Record<string, unknown> | undefined;
      const apiErrorMessage = apiError?.message as string | undefined;
      
      const fullErrorMessage = apiErrorMessage || errMessage;
      
      if (fullErrorMessage.includes("401") || fullErrorMessage.includes("Unauthorized") || fullErrorMessage.includes("invalid_api_key")) {
        errorMessage = "API Key 无效，请检查配置~";
      } else if (fullErrorMessage.includes("429") || fullErrorMessage.includes("rate limit") || fullErrorMessage.includes("quota")) {
        errorMessage = "请求太频繁了，休息一下吧~";
      } else if (fullErrorMessage.includes("timeout") || fullErrorMessage.includes("ETIMEDOUT")) {
        errorMessage = "连接超时了，网络不太好呢~";
      } else if (fullErrorMessage.includes("ECONNREFUSED") || fullErrorMessage.includes("fetch failed") || fullErrorMessage.includes("network")) {
        errorMessage = "连接失败，请检查服务地址~";
      } else if (fullErrorMessage.includes("model") || fullErrorMessage.includes("not found") || fullErrorMessage.includes("does not exist")) {
        errorMessage = "模型不可用，请检查模型名称~";
      } else if (fullErrorMessage.includes("Cannot read properties of undefined")) {
        errorMessage = "API 返回格式异常，请检查服务~";
      } else if (fullErrorMessage) {
        errorMessage = fullErrorMessage.slice(0, 50); // 限制长度
      }
      
      error.value = errorMessage;
      petStore.say(`哎呀，${errorMessage}`);
      petStore.setState("idle");
      return "";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 取消当前对话（如果支持）
   */
  const abort = () => {
    // TODO: 如果需要支持取消，可以添加 AbortController
    isLoading.value = false;
    petStore.setState("idle");
  };

  return {
    isLoading,
    error,
    chat,
    abort,
  };
}
