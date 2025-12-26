import { ref } from "vue";
import { usePetStore } from "@/stores/pet";
import type { AIConfig, ChatMessage } from "@/types";

/**
 * AI 对话服务的组合式函数
 * 支持多种 AI 提供商
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
      const messages = [
        {
          role: "system",
          content: petStore.config.personality,
        },
        // 添加最近的几条对话记录（保持上下文）
        ...petStore.chatHistory.slice(-6).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ];

      // 记录用户消息
      petStore.addMessage("user", userMessage);

      // 调用 API
      const response = await callAI(messages);

      // 记录 AI 回复
      petStore.addMessage("assistant", response);

      // 显示回复
      petStore.say(response, 8000);

      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "发生错误";
      petStore.say("哎呀，出错了...");
      return "";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 调用 AI API
   */
  const callAI = async (
    messages: Array<{ role: string; content: string }>
  ): Promise<string> => {
    const { provider, apiKey, baseUrl, model } = petStore.aiConfig;

    // OpenAI 兼容格式（适用于 OpenAI / DeepSeek / Ollama）
    let endpoint = baseUrl;

    switch (provider) {
      case "openai":
        // 使用配置的 baseUrl，支持代理
        endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
        break;
      case "deepseek":
        // 如果 baseUrl 看起来像 DeepSeek 的地址，则使用它，否则使用默认值
        // 这样可以兼容用户未修改 baseUrl 的情况
        endpoint = baseUrl.includes("deepseek")
          ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
          : "https://api.deepseek.com/chat/completions";
        break;
      case "ollama":
        endpoint = "http://localhost:11434/api/chat";
        break;
      case "custom":
        endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
        break;
    }

    // Ollama 使用不同的请求格式
    if (provider === "ollama") {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama 请求失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || "";
    }

    // OpenAI 兼容格式
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 150, // 限制回复长度（桌宠对话应该简短）
        temperature: 0.8, // 增加一些随机性
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `请求失败: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  };

  return {
    isLoading,
    error,
    chat,
  };
}
