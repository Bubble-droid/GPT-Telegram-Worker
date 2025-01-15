// src/config/commands.ts
import { TelegramBot } from '../api/telegram';
import { translate, TranslationKey } from '../utils/i18n';
import { sendChatAction } from '../utils/helpers';
import { getConfig } from '../env';

export interface Command {
  name: string;
  description: TranslationKey;
  action: (chatId: number, bot: TelegramBot, args: string[]) => Promise<void>;
}

export const commands: Command[] = [
  {
    name: 'start',
    description: 'start_description',
    action: async (chatId: number, bot: TelegramBot, args: string[]) => {
      const userId = chatId.toString();
      const language = await bot.getUserLanguage(userId);
      const currentModel = await bot.getCurrentModel(userId);
      const welcomeMessage = translate('welcome', language) + '\n' +
      translate('current_model', language) + currentModel + '\n' + // 添加当前模型信息
      translate('group_usage_hint', language);
      await bot.sendMessageWithFallback(chatId, welcomeMessage);
    },
  },
{
  name: 'language',
  description: 'language_description',
  action: async (chatId: number, bot: TelegramBot, args: string[]) => {
    const userId = chatId.toString();
    const currentLanguage = await bot.getUserLanguage(userId);
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🇺🇸 English', callback_data: 'lang_en' },
          { text: '🇨🇳 简体中文', callback_data: 'lang_zh' }
        ]
      ]
    };
    await bot.sendMessage(chatId, translate('choose_language', currentLanguage), { reply_markup: JSON.stringify(keyboard) });
  },
},
{
  name: 'switchmodel',
  description: 'switchmodel_description',
  action: async (chatId: number, bot: TelegramBot, args: string[]) => {
    const userId = chatId.toString();
    const language = await bot.getUserLanguage(userId);
    const config = getConfig(bot.env); // 修改这里
    try {
      let availableModels = [
        ...config.googleModels,
      ];

      const keyboard = {
        inline_keyboard: availableModels.map(model => [{ text: model, callback_data: `model_${model}` }])
      };
      await bot.sendMessage(chatId, translate('choose_model', language), { reply_markup: JSON.stringify(keyboard) });
    } catch (error) {
      console.error('Error in switchmodel command:', error);
      await bot.sendMessage(chatId, translate('error', language) + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },
},
{
  name: 'new',
  description: 'new_description',
  action: async (chatId: number, bot: TelegramBot, args: string[]) => {
    const userId = chatId.toString();
    await bot.clearContext(userId);
  },
},
{
  name: 'history',
  description: 'history_description',
  action: async (chatId: number, bot: TelegramBot, args: string[]) => {
    const userId = chatId.toString();
    const language = await bot.getUserLanguage(userId);
    const summary = await bot.summarizeHistory(userId);
    await bot.sendMessage(chatId, summary || translate('no_history', language));
  },
},
{
  name: 'help',
  description: 'help_description',
  action: async (chatId: number, bot: TelegramBot, args: string[]) => {
    const userId = chatId.toString();
    const language = await bot.getUserLanguage(userId);
    let helpMessage = translate('help_intro', language) + '\n\n';

    for (const command of commands) {
      const descriptionKey = `${command.name}_description` as TranslationKey;
      helpMessage += `/${command.name} - ${translate(descriptionKey, language)}\n`;
    }

    await bot.sendMessage(chatId, helpMessage);
  },
}
];
