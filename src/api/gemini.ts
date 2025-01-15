// src/api/gemini.ts
import { Env, getConfig } from '../env';
import { formatCodeBlock } from '../utils/helpers';

interface GeminiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ModelAPIInterface {
  generateResponse(messages: { role: string, content: string }[], model?: string): Promise<string>;
  isValidModel(model: string): boolean;
  getDefaultModel(): string;
  getAvailableModels(): string[];
}

export default class GeminiAPI implements ModelAPIInterface {
  private apiKey: string;
  private baseUrl: string;
  private models: string[];
  private defaultModel: string;


  constructor(env: Env, trainingData?: any) {
    const config = getConfig(env);
    this.apiKey = config.googleModelKey;
    this.baseUrl = config.googleModelBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.models = config.googleModels;
    this.defaultModel =  config.defaultModel || this.models[0];
  }

  async generateResponse(messages: { role: string, content: string }[], model?: string): Promise<string> {
    const useModel = model || this.defaultModel;
    const url = `${this.baseUrl}/chat/completions`;

    // 添加日志输出，检查发送到 Gemini API 的消息内容
    console.log("Gemini API Request Messages:", JSON.stringify(messages, null, 2));


    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: messages,
        n: 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.statusText}`, errorText);
      throw new Error(`Gemini API error: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json() as GeminiResponse;
    if (!data.choices || data.choices.length === 0) {
      throw new Error('Gemini API did not return any choices');
    }

    let content = data.choices[0].message.content;

    // 代码块格式化提取到 formatCodeBlock 函数
    content = content.replace(/```\s*(\w*)\s*\n([\s\S]+?)```/g, (_, lang, code) => {
      return formatCodeBlock(code, lang || '');
    });

    return content;
  }

  isValidModel(model: string): boolean {
    return this.models.includes(model);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAvailableModels(): string[] {
    return this.models;
  }
}
