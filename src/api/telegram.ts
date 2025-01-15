// src/api/telegram.ts
import { Env, getConfig } from '../env';
import { TelegramTypes } from '../../types/telegram';
import {
  formatCodeBlock,
    formatHtml,
      formatMarkdown,
        stripFormatting,
        sendChatAction,
        splitMessage
} from '../utils/helpers';
import { translate, SupportedLanguages, Translations } from '../utils/i18n';
import { commands, Command } from '../config/commands';
import { RedisClient } from '../utils/redis';
import { RateLimiter } from '../utils/rate-limiter';
import GeminiAPI from './gemini';

interface SystemMessage {
  role: string;
  content: string;
}


export default class TelegramBot {
  private token: string;
  private apiUrl: string;
  private whitelistedUsers: string[];
  private systemMessage: SystemMessage;
  private botName: string; // 修改为从环境变量获取
  private env: Env;
  private commands: Command[];
  private redis: RedisClient;
  private modelAPI: any;
  private readonly languageNames = {
    'en': 'English',
    'zh': 'Chinese'
  };
  private kv: KVNamespace;
  private rateLimiter: RateLimiter;
  private contextResetInterval: number;
  private groupCooldownInterval: number; // 新增群组冷却间隔属性


  constructor(env: Env) {
    const config = getConfig(env);
    this.token = config.telegramBotToken;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.whitelistedUsers = config.whitelistedUsers;
    this.env = env;
    this.commands = commands;
    this.redis = new RedisClient(env);
    this.kv = env.COOLDOWN;
    this.loadSystemMessage().catch(console.error);
    this.setMenuButton().catch(console.error);
    this.botName = config.botName; // 从环境变量中读取bot名称
    this.groupCooldownInterval = config.groupCooldownInterval; // 从环境变量中读取群组冷却间隔
    this.rateLimiter = new RateLimiter(this.groupCooldownInterval, this.kv); // 使用环境变量设置的冷却时间
  }

  async initialize(): Promise<void> {
    this.modelAPI = await this.initializeModelAPI('default');
    this.setMenuButton().catch(console.error);
  }

  private async initializeModelAPI(userId: string, trainingData?: any): Promise<any> {
    const config = getConfig(this.env);
    const currentModel = await this.getCurrentModel(userId);
    const modelToUse = config.googleModels?.includes(currentModel) ? currentModel : config.googleModels?.[0] || config.defaultModel;

    if (config.googleModelKey && config.googleModels?.includes(modelToUse)) {
      console.log(`Using GeminiAPI with model: ${modelToUse}`);
      return new GeminiAPI(this.env, null);
    }

    throw new Error(`No valid API configuration found for model: ${modelToUse}`);
  }


  async loadSystemMessage(): Promise<void> {
    try {
      if (this.kv) {
        const systemMessageJSON = await this.kv.get('SYSTEM_INIT_MESSAGE');
        if (systemMessageJSON) {
          try {
            const parsedMessage = JSON.parse(systemMessageJSON);
            this.systemMessage = {
              role: parsedMessage.role || getConfig(this.env).systemInitMessageRole || 'system',
              content: parsedMessage.content || getConfig(this.env).systemInitMessage
            };
          } catch (e) {
            console.error('Error parsing system message JSON:', e);
            this.systemMessage = {
              role:  getConfig(this.env).systemInitMessageRole || 'system',
              content: getConfig(this.env).systemInitMessage
            };
          }
        } else {
          this.systemMessage = {
            role:  getConfig(this.env).systemInitMessageRole || 'system',
            content: getConfig(this.env).systemInitMessage
          };
        }

      } else {
        this.systemMessage = {
          role: getConfig(this.env).systemInitMessageRole || 'system',
          content: getConfig(this.env).systemInitMessage
        };
      }
    } catch (error) {
      console.error('Error loading system message from KV:', error);
      this.systemMessage = {
        role:  getConfig(this.env).systemInitMessageRole || 'system',
        content: getConfig(this.env).systemInitMessage
      };
    }
  }

  async loadTrainingData(): Promise<any> {
    return {};
  }

  public async executeCommand(commandName: string, chatId: number, args: string[]): Promise<void> {
    const command = this.commands.find(cmd => cmd.name === commandName);
    if (command) {
      await command.action(chatId, this, args);
    } else {
      console.log(`Unknown command: ${commandName}`);
      const language = await this.getUserLanguage(chatId.toString());
      await this.sendMessage(chatId, translate('command_not_found', language));
    }
  }

  private async sendMessageInternal(
    chatId: number,
    text: string,
    options: { parse_mode?: 'Markdown' | 'HTML', reply_markup?: string, reply_to_message_id?: number } = {}
  ): Promise<TelegramTypes.SendMessageResult[]> {
    const url = `${this.apiUrl}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup,
    };

    if (options.reply_to_message_id) {
      payload.reply_to_message_id = options.reply_to_message_id;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Telegram API error: ${response.statusText}`, errorText);
        throw new Error(`Telegram API error: ${response.statusText}\n${errorText}`);
      }

      return [await response.json() as TelegramTypes.SendMessageResult];
    } catch (error) {
      console.error('Error sending message part:', error);
      return [];
    }
  }

  async sendMessage(chatId: number, text: string, options: { parse_mode?: 'Markdown' | 'HTML', reply_markup?: string, reply_to_message_id?: number } = {}): Promise<TelegramTypes.SendMessageResult[]> {
    const messages = splitMessage(text);
    const results: TelegramTypes.SendMessageResult[] = [];
    for (const message of messages) {
      const res = await this.sendMessageInternal(chatId, message, options);
      results.push(...res);
    }
    return results;
  }

  private async handleGroupMessage(message: TelegramTypes.Message, userId: string): Promise<void> {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const language = await this.getUserLanguage(userId);

    let messageText = message.text || '';

    // 检查消息是否包含 @botName
    if (!messageText.includes(`@${this.botName}`)) {
      return; // 如果不包含，直接返回
    }

    // 如果是命令，检查是否在白名单中
    if (messageText.startsWith('/')) {
      if(!this.isUserWhitelisted(userId)){
        return;
      }
      const [commandName, ...args] = messageText.slice(1).split(' ');
      await this.executeCommand(commandName, chatId, args);
      return;
    }
    messageText = messageText.replace(`@${this.botName}`, '').trim();
    // 立即进行冷却检查, 白名单用户跳过冷却
    if (!this.isUserWhitelisted(userId) && await this.rateLimiter.isRateLimited(chatId)) {
      const remainingTime = await this.rateLimiter.getRemainingTime(chatId);
      const cooldownMessage = translate('group_cooldown', language) + ' ' + Math.ceil(remainingTime / 1000) + ' ' + translate('seconds', language);
      await this.sendMessageWithFallback(chatId, cooldownMessage, { reply_to_message_id: messageId });
      return; // 如果需要冷却，立即返回
    }

    // 如果没有被冷却，则设置冷却时间并继续处理
    if(!this.isUserWhitelisted(userId)){
      await this.rateLimiter.setLastRequestTime(chatId);
    }


    try {
      const currentModel = await this.getCurrentModel(userId);
      await sendChatAction(chatId, 'typing', this.env);
      const modelAPI = await this.initializeModelAPI(userId);

      const context = await this.getContext(userId)
      const processedContext = context ? this.processContext(context) : '';

      let messages: { role: string, content: string }[] = [
        this.systemMessage,
        ...(processedContext ? [{ role: 'user', content: processedContext }] : []),
        { role: 'user', content: messageText }
      ];

      // 添加 generateResponse 的重试机制
      let retries = 3;
      let retryDelay = 1000;
      let response = '';
      while (retries > 0) {
        try {
          response = await modelAPI.generateResponse(messages, currentModel);
          break; // 成功获取响应，跳出循环
        } catch (error) {
          if (error.message.includes("The model is overloaded") && retries > 0) {
            console.warn(`Model overloaded, retrying in ${retryDelay}ms. Retries remaining: ${retries - 1}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries--;
            retryDelay *= 2;
          } else {
            console.error('Gemini API error:', error);
            throw error;
          }
        }
      }
      if (!response) {
        throw new Error("Failed to generate response after multiple retries.");
      }

      const formattedResponse = this.formatResponse(response);
      const disclaimer = translate('disclaimer', language);
      const messageToSend = `🤖 ${currentModel}\n${formattedResponse}${disclaimer}`; // 将警告添加到消息末尾

      await this.sendMessageWithFallback(chatId, messageToSend, { reply_to_message_id: messageId });

      await this.storeContext(userId, `Q: ${messageText}\nA: ${response}`);


    } catch (error) {
      console.error('Error in handleGroupMessage:', error);
    }
  }


  async handleUpdate(update: TelegramTypes.Update): Promise<void> {
    console.log('Received update:', JSON.stringify(update));
    console.log('Chat type:', update.message?.chat.type);

    const isGroup = update.message ? update.message.chat.type !== 'private' : false;
    //  使用this.botName
    console.log('Bot name:', this.botName);

    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      const message = update.message;
      const chatId = update.message.chat.id;
      const userId = update.message.from?.id?.toString();
      const messageId = update.message.message_id;

      if (!userId) {
        console.error('User ID is undefined');
        return;
      }

      const language = await this.getUserLanguage(userId);

      // 群组消息处理
      if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
        await this.handleGroupMessage(message, userId);
        return;
      } else {
        // 私聊消息 (保持原有逻辑)
        if (this.isUserWhitelisted(userId)) {
          if ('photo' in update.message || 'video' in update.message || 'document' in update.message) {
            await this.sendMessageWithFallback(chatId, translate('unsupported_message', language), { reply_to_message_id: messageId });
            return;
          }

          if (update.message.text) {
            if (update.message.text.startsWith('/')) {
              const [commandName, ...args] = update.message.text.slice(1).split(' ');
              await this.executeCommand(commandName, chatId, args);
            } else {
              try {
                const currentModel = await this.getCurrentModel(userId);
                await sendChatAction(chatId, 'typing', this.env);
                const modelAPI = await this.initializeModelAPI(userId);
                const context = await this.getContext(userId);
                const processedContext = context ? this.processContext(context) : null;
                let messages: { role: string, content: string }[] = [
                  this.systemMessage,
                  ...(processedContext ? [{ role: 'user', content: processedContext }] : []),
                  { role: 'user', content: update.message.text }
                ];
                const response = await modelAPI.generateResponse(messages, currentModel);
                const formattedResponse = this.formatResponse(response);
                const disclaimer = translate('disclaimer', language); // 使用 translate 函数获取提示信息
                const messageToSend = `🤖 ${currentModel}\n${formattedResponse}${disclaimer}`;
                await this.sendMessageWithFallback(chatId, messageToSend, { reply_to_message_id: messageId});
                await this.storeContext(userId, `Q: ${update.message.text}\nA: ${response}`);
              } catch (error) {
                console.error('Error in handleUpdate:', error);
              }
            }
          }

        } else {
          if (!isGroup) {
            await this.sendMessageWithFallback(chatId, translate('unauthorized', language), { reply_to_message_id: messageId });
          }
        }
      }
    }
  }

  // 优先尝试发送 HTML 格式的消息，失败则回退到纯文本格式
  async sendMessageWithFallback(chatId: number, text: string, options: { reply_to_message_id?: number, parse_mode?: TelegramTypes.ParseMode} = {}): Promise<TelegramTypes.SendMessageResult[]> {
    let results: TelegramTypes.SendMessageResult[] = [];
    try {
      const result = await this.sendMessage(chatId, formatHtml(text), { parse_mode: 'HTML', ...options });
      results.push(...result);
      return results
    } catch (error) {
      console.error('Error sending HTML message, trying fallback:', error);
      try {
        const plainText = stripFormatting(text);
        const result =  await this.sendMessage(chatId, plainText, options);
        results.push(...result);
      } catch (fallbackError) {
        console.error('Error sending plain text message:', fallbackError);
      }
    }
    return results;
  }

  async editMessage(chatId: number, messageId: number, text: string, options: { parse_mode?: 'Markdown' | 'HTML' } = {}): Promise<any> {
    const url = `${this.apiUrl}/editMessageText`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          ...options
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Telegram API error in editMessage: ${response.statusText}`, errorText);
        throw new Error(`Telegram API error: ${response.statusText}\n${errorText}`);
      }
      const result = await response.json();
      if (!result.ok) {
        console.error(`Telegram API error in editMessage: not ok`, result);
        throw new Error(`Telegram API error: not ok \n ${JSON.stringify(result)}`);
      }
      return result;
    } catch (e) {
      console.error('Error edit message:', e);
      throw e;
    }
  }

  async deleteMessage(chatId: number, messageId: number): Promise<any> {
    const url = `${this.apiUrl}/deleteMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Telegram API error in deleteMessage: ${response.statusText}`, errorText);
        throw new Error(`Telegram API error: ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      if(!result.ok){
        console.error(`Telegram API error in deleteMessage: not ok`, result);
        throw new Error(`Telegram API error: not ok \n ${JSON.stringify(result)}`)
      }
      return result;

    } catch (error) {
      console.error('Error delete message:', error);
      throw error;
    }
  }

  //  单独处理 /start 命令
  private async handleStartCommand(chatId: number, userId: string, isGroup: boolean, messageId: number): Promise<void> {
    const language = await this.getUserLanguage(userId);
    const currentModel = await this.getCurrentModel(userId);
    const welcomeMessage = translate('welcome', language) + '\n' +
    translate('current_model', language) + currentModel + '\n' +
    translate('group_usage_hint', language);
    await this.sendMessageWithFallback(chatId, welcomeMessage, { reply_to_message_id: isGroup ? messageId : undefined });
  }

  private async handleCallbackQuery(query: TelegramTypes.CallbackQuery): Promise<void> {
    if (!query.message || !query.data) {
      console.log('Invalid callback query');
      return;
    }

    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const language = await this.getUserLanguage(userId);

    console.log('Handling callback query:', query.data);

    if (query.data.startsWith('lang_')) {
      const newLanguage = query.data.split('_')[1] as SupportedLanguages;
      await this.setUserLanguage(userId, newLanguage);
      await this.sendMessageWithFallback(chatId, translate('language_changed', newLanguage) + translate(`language_${newLanguage}` as keyof Translations, newLanguage));
    } else if (query.data.startsWith('model_')) {
      const newModel = query.data.split('_')[1];
      console.log('Switching to model:', newModel);
      try {
        await this.clearContext(userId);
        await this.setCurrentModel(userId, newModel);
        await this.sendMessageWithFallback(chatId, translate('model_changed', language) + newModel);
      } catch (error) {
        console.error('Error switching model:', error);
        await this.sendMessageWithFallback(chatId, translate('error', language) + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // Answer the callback query to remove the loading state
    try {
      await fetch(`${this.apiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id })
      });
      console.log('Callback query answered');
    } catch (error) {
      console.error('Error answering callback query:', error);
    }
  }

  async getUserLanguage(userId: string): Promise<SupportedLanguages> {
    const language = await this.redis.get(`language:${userId}`);
    return (language as SupportedLanguages) || 'zh';
  }

  async setUserLanguage(userId: string, language: SupportedLanguages): Promise<void> {
    await this.redis.setLanguage(userId, language);
  }

  async getCurrentModel(userId: string): Promise<string> {
    const model = await this.redis.get(`model:${userId}`);
    if (model) {
      return model;
    }
    const config = getConfig(this.env);
    // 按优先级返回默认模型
    if (config.googleModels.length > 0) return config.googleModels[0];
    throw new Error('No valid model configuration found');
  }

  async setCurrentModel(userId: string, model: string): Promise<void> {
    await this.redis.set(`model:${userId}`, model);
    console.log(`Switching to model: ${model}`);
    this.modelAPI = await this.initializeModelAPI(userId);
  }

  getAvailableModels(): string[] {
    return this.modelAPI.getAvailableModels();
  }

  isValidModel(model: string): boolean {
    return this.modelAPI.isValidModel(model);
  }

  async storeContext(userId: string, context: string): Promise<void> {
    // 存储时只保留纯文本内容
    const cleanContext = this.processContext(context);
    await this.redis.appendContext(userId, cleanContext);
  }

  async getContext(userId: string): Promise<string | null> {
    return await this.redis.get(`context:${userId}`);
  }

  async clearContext(userId: string): Promise<void> {
    await this.redis.del(`context:${userId}`);
    const language = await this.getUserLanguage(userId);
    await this.sendMessageWithFallback(parseInt(userId), translate('new_conversation', language));
  }

  async summarizeHistory(userId: string): Promise<string> {
    const modelAPI = await this.initializeModelAPI(userId);

    const context = await this.getContext(userId);
    const language = await this.getUserLanguage(userId);
    if (!context) {
      return translate('no_history', language);
    }

    const currentModel = await this.getCurrentModel(userId);
    console.log(`Summarizing history with model: ${currentModel}`);

    // 清理上下文格式
    const cleanContext = this.processContext(context);

    let messages: { role: string, content: string }[] = [
      { role: 'system', content: `Summarize the following conversation in ${this.languageNames[language]}:` },
      { role: 'user', content: cleanContext }
    ];

    const summary = await modelAPI.generateResponse(messages, currentModel);
    return `${translate('history_summary', language)}\n\n${summary}`;
  }

  private formatResponse(response: string): string {
    try {
      // 先尝试标准化代码块格式
      let processedResponse = response.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const trimmedCode = code.trim()
        .replace(/^\n+|\n+$/g, '')
        .replace(/\n{3,}/g, '\n\n');
        return `\n\`\`\`${lang || ''}\n${trimmedCode}\n\`\`\`\n`;
      });
      return processedResponse;
    } catch (error) {
      console.error('Error formatting response:', error);
      return stripFormatting(response);
    }
    // 使用 formatHtml 函数处理 HTML 格式
    return formatHtml(response);
  }

  isUserWhitelisted(userId: string): boolean {
    return this.whitelistedUsers.includes(userId);
  }

  async handleWebhook(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const update: TelegramTypes.Update = await request.json();
      await this.handleUpdate(update);
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  async sendPhoto(chatId: number, photo: string | Uint8Array, options: { caption?: string } = {}): Promise<void> {
    const url = `${this.apiUrl}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());

    if (typeof photo === 'string') {
      formData.append('photo', photo);
    } else {
      const blob = new Blob([photo], { type: 'image/png' });
      formData.append('photo', blob, 'image.png');
    }

    if (options.caption) {
      formData.append('caption', options.caption);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async setWebhook(url: string): Promise<void> {
    const setWebhookUrl = `${this.apiUrl}/setWebhook`;
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set webhook: ${response.statusText}`);
    }

    const result: { ok: boolean; description?: string } = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
  }
  private async setMenuButton(): Promise<void> {
    const url = `${this.apiUrl}/setMyCommands`;
    try{
      const userLanguages = await this.redis.getAllUserLanguages();
      for (const [userId, lang] of Object.entries(userLanguages)) {
        const commands = this.commands.map(cmd => ({
          command: cmd.name,
          description: translate(cmd.description, lang as SupportedLanguages)
        }));

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              commands: commands,
              scope: {
                type: 'chat',
                chat_id: parseInt(userId)
              }
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to set menu button for user ${userId}: ${response.statusText}`);
          }

          console.log(`Menu button set successfully for user ${userId} with language: ${lang}`);
        } catch (error) {
          console.error(`Error setting menu button for user ${userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetch User languages:', error);
    }


    const defaultCommands = this.commands.map(cmd => ({
      command: cmd.name,
      description: translate(cmd.description, 'zh')
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: defaultCommands
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set default menu button: ${response.statusText}`);
      }

      console.log('Default menu button set successfully');
    } catch (error) {
      console.error('Error setting default menu button:', error);
    }
  }

  private standardizeMarkdown(text: string): string {
    return text
    // 确保代码块前后有换行
    .replace(/([^\n])```/g, '$1\n```')
    .replace(/```([^\n])/g, '```\n$1')
    // 修复可能的嵌套星号问题
    .replace(/\*\*\*/g, '*')
    .replace(/\*\*\*/g, '*')
    // 确保链接格式正确
    .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
    // 保行内代码前后有空格
    .replace(/([^\s`])`([^`]+)`([^\s`])/g, '$1 `$2` $3')
  }

  private processContext(context: string): string {
    try {
      //尝试解析是否为JSON格式的初始化消息
      const parsed = JSON.parse(context) as SystemMessage;
      return parsed.content
    } catch(e){
      // 移除所有的 Markdown 格式标记
      return context
      .replace(/^(Q|A|User|Assistant): /gm, '') // 移除对话标记
      .replace(/```[\s\S]*?```/g, (match) => {   // 处理代码块
        return match
        .replace(/^```\w*\n/, '')
        .replace(/\n```$/, '')
        .trim();
      })
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1')      // 移除加粗斜体
      .replace(/\*\*(.*?)\*\*/g, '$1')          // 移除加粗
      .replace(/\*(.*?)\*/g, '$1')              // 移除斜体
      .replace(/`([^`]+)`/g, '$1')              // 移除行内代码
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')// 移除链接
      .trim();
    }
  }
}
