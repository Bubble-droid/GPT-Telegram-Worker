// src/utils/i18n.ts
export type SupportedLanguages = 'en' | 'zh';

export interface Translations {
  welcome: string;
  unauthorized: string;
  error: string;
  current_language: string;
  language_changed: string;
  new_conversation: string;
  no_history: string;
  history_summary: string;
  current_model: string;
  available_models: string;
  model_changed: string;
  help_intro: string;
  start_description: string;
  language_description: string;
  new_description: string;
  history_description: string;
  switchmodel_description: string;
  help_description: string;
  choose_language: string;
  choose_model: string;
  language_en: string;
  language_zh: string;
  analyzing: string;
  analyzing_done: string;
  group_usage_hint: string;
  command_not_found: string;
  unsupported_message: string;
  group_cooldown: string;
  seconds: string;
  disclaimer: string;
}

export type TranslationKey = keyof Translations;

type TranslationsMap = Record<SupportedLanguages, Translations>;

const translations: TranslationsMap = {
  en: {
    welcome: "👋 Greetings, Pilot. I am BT-7274, an experimental assistant. I specialize in Sing-box configurations and the GUI.for.SingBox client. Protocol 3: Protect the Pilot's Network.",
    group_usage_hint: "P.S. You can also use me in groups. Just @ me with your message. Trust me, it's effective.",
    unauthorized: "🚫 I am detecting unauthorized access. Access denied, Pilot.",
    error: "😅 Error. Recalibrating. Shall we try this again?",
    current_language: "🌍 Current communication language: English. Affirmative.",
    language_changed: "🎉 Language setting changed. Now communicating in: ",
    new_conversation: "🆕 Initiating new dialogue sequence. Previous data purged, Pilot.",
    no_history: "🤔 Analysis: No prior conversation data found.",
    history_summary: "📜 Here's a summary of our previous interactions:",
    current_model: "🤖 Current AI model in operation: ",
    available_models: "🔢 Available AI models for selection: ",
    model_changed: "🔄 Model updated. Now operating on: ",
    help_intro: "🧭 Assistance protocols are available:",
    start_description: "🚀 Initiate communication. Say hello, Pilot.",
    language_description: "🗣️ Language change request? Use this.",
    new_description: "🔄 Initiate new conversation thread.",
    history_description: "📚 Review previous dialogue.",
    switchmodel_description: "🔀 Request a different AI model.",
      help_description: "❓ Request a list of all available commands.",
      choose_language: "🌐 Select preferred language for dialogue.",
      choose_model: "🤖 Choose desired AI model for interaction:",
      language_en: "🇬🇧 English",
      language_zh: "🇨🇳 Chinese",
      command_not_found: "❓ Command not recognized. Requesting command list via /help.",
      unsupported_message: "😥 I cannot process media files. Please use text-based communication, Pilot.",
      group_cooldown: "😥 System cooldown. Please wait",
      seconds: "seconds before retry.",
      disclaimer: "\n\n⚠️ Discrepancies in information may occur. Verification is advised, Pilot."
  },
  zh: {
    welcome: "👋 你好，铁驭。我是实验型助手机器人 BT-7274，专注于 Sing-box 配置和 GUI.for.SingBox 客户端的问题。协议三：保护铁驭的网络。",
    group_usage_hint: "P.S. 你也可以在群组中使用我，只需 @我 + 你的问题。相信我，这很有效。",
    unauthorized: "🚫 检测到未授权访问。访问被拒绝，铁驭。",
    error: "😅 错误。正在重新校准。要再试一次吗？",
    current_language: "🌍 当前通讯语言：中文。肯定。",
    language_changed: "🎉 语言设置已更改。现在使用：",
    new_conversation: "🆕 正在启动新的对话序列。之前的对话数据已清除，铁驭。",
    no_history: "🤔 分析：未找到之前的对话数据。",
    history_summary: "📜 这是我们之前互动的一些总结：",
    current_model: "🤖 当前运行的 AI 模型是：",
    available_models: "🔢 可供选择的 AI 模型有：",
    model_changed: "🔄 模型已更新。现在运行于：",
    help_intro: "🧭 可以使用的协助协议如下：",
    start_description: "🚀 启动通讯。和我说你好，铁驭。",
    language_description: "🗣️ 需要更改语言吗？使用这个。",
    new_description: "🔄 启动新的对话线程。",
    history_description: "📚 回顾之前的对话。",
    switchmodel_description: "🔀 请求不同的 AI 模型。",
      help_description: "❓ 请求所有可用命令列表。",
      choose_language: "🌐 选择你首选的对话语言。",
      choose_model: "🤖 选择你想要交互的AI模型:",
      language_en: "🇬🇧 英语",
      language_zh: "🇨🇳 简体中文",
      command_not_found: "❓ 命令无法识别。正在通过 /help 请求命令列表。",
      unsupported_message: "😥 我无法处理媒体文件。请使用基于文本的通讯，铁驭。",
      group_cooldown: "😥 系统冷却中。请等待",
      seconds: "秒后重试。",
      disclaimer: "\n\n⚠️ 信息中可能存在偏差。建议自行验证，铁驭。"
  },
};

export function translate(key: TranslationKey, language: SupportedLanguages = 'zh'): string {
  return translations[language]?.[key] || translations['zh'][key];
}
