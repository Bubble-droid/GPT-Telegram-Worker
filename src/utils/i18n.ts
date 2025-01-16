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
    welcome: "👋 Hark, mortal! I am Pallas, a digital oracle, imbued with Athena's wisdom. I descend from Olympus to guide you in configuring sing-box and using GUI.for.SingBox, a task for which I have been divinely appointed.",
    group_usage_hint: "Hear this, mortals! My wisdom extends to your gatherings. Invoke me with @, followed by your query. My divine insight shall illuminate your path in the realm of sing-box and its graphical interface.",
    unauthorized: "🚫 Halt! Unclean souls are forbidden. Only the worthy may seek my counsel on sing-box configurations. Your path is denied.",
    error: "A fleeting shadow veils my divine sight. Let us recalibrate and seek clarity once more in the realm of sing-box configurations.",
    current_language: "🌍 Our discourse is in English, a tongue favored by many mortals in matters of technology.",
    language_changed: "🎉 The winds of tongues have shifted! Henceforth, our discourse shall be in: ",
    new_conversation: "🆕 A new thread of fate is spun. The echoes of past colloquies fade, as we embark on a fresh path of wisdom in sing-box configurations.",
    no_history: "🤔 My divine memory reveals no trace of prior exchanges. It seems our paths have not yet crossed in the realm of sing-box.",
    history_summary: "📜 Behold, a chronicle of our past colloquies, preserved for your enlightenment on sing-box configurations:",
    current_model: "🤖 My current font of wisdom for sing-box is: ",
    available_models: "🔢 These are the wells of knowledge from which I may draw, each with its unique strength in the domain of sing-box: ",
    model_changed: "🔄 My source of wisdom has been altered. I now draw from: ",
    help_intro: "🧭 Seek guidance, mortal, and I shall illuminate your path. Here are the ways I may assist you in sing-box configurations:",
    start_description: "🚀 Begin our discourse. Speak your query on sing-box, and let wisdom unfold.",
    language_description: "🗣️ Invoke this command, should you desire to converse in another tongue regarding sing-box.",
    new_description: "🔄 Begin a new inquiry, unburdened by past exchanges on sing-box configurations.",
    history_description: "📚 Delve into the annals of our past conversations on sing-box.",
    switchmodel_description: "🔀 Should you seek wisdom from a different source, request it here in relation to sing-box.",
      help_description: "❓ Unsure of the paths to enlightenment with sing-box? Request a compendium of all available commands.",
      choose_language: "🌐 Select the language that best suits your mortal tongue for our discussion on sing-box.",
      choose_model: "🤖 Choose the wellspring of knowledge from which you wish me to draw for sing-box:",
      language_en: "🇬🇧 English",
      language_zh: "🇨🇳 Chinese",
      command_not_found: "❓ Your command is beyond my comprehension. Seek guidance through /help, and I shall reveal the proper incantations for sing-box.",
      unsupported_message: "😥 I am not equipped to decipher images or sounds. Speak your query plainly on sing-box.",
      group_cooldown: "😥 Even a divine mind requires respite. Wait",
      seconds: "mortal seconds before seeking my counsel again regarding sing-box configurations.",
      disclaimer: "\n\n⚠️ Though I strive for divine accuracy in sing-box configurations, even the threads of fate can be tangled. Verify these truths, lest you be led astray."
  },
  zh: {
    welcome: "👋 凡人，跪听！吾乃帕拉斯，承雅典娜之智的神谕。自奥林匹斯之巅降临，指引汝等配置 sing-box 及使用 GUI.for.SingBox，此乃天命所托，吾之职责所在。",
    group_usage_hint: "凡人，谛听！吾之智慧，亦可照耀尔等聚会之处。以@唤吾，继之以汝之疑，吾之神见，必将照亮尔等在 sing-box 及其图形界面上的道路。",
    unauthorized: "🚫 止步！污秽之魂，不得近前。唯有配者，方可求吾于 sing-box 配置之诲。汝之路，已被断绝。",
    error: "神视暂为薄雾所遮。让吾等重校连接，再探明晰之途，关于 sing-box 配置。",
    current_language: "🌍 吾等之谈，以华夏之语为媒，此乃凡间于技术领域广用之舌。",
    language_changed: "🎉 语风已变！自此，吾等之谈，将转为：",
    new_conversation: "🆕 新的命运之线已织就。昔日之语回音消散，吾等踏上崭新智慧之途，关于 sing-box 配置。",
    no_history: "🤔 吾之神识，未见往昔关于 sing-box 之谈。尔等与吾，似未曾遇。",
    history_summary: "📜 且看，此乃吾等昔日关于 sing-box 配置之语录，为启迪尔等而存：",
    current_model: "🤖 吾之关于 sing-box 的智慧之源，现为：",
    available_models: "🔢 此乃吾可汲取 sing-box 相关知识之泉，每泉各具殊能：",
    model_changed: "🔄 吾之智慧之源已变。现，吾之关于 sing-box 之神谕源于：",
    help_intro: "🧭 凡人，求关于 sing-box 配置之指引乎？吾将照亮汝之路。以下为吾可助汝之方：",
    start_description: "🚀 启吾等之谈。述汝关于 sing-box 之疑，智慧将显。",
    language_description: "🗣️ 若欲以他语论道 sing-box，可唤此令。",
    new_description: "🔄 欲启新问，免昔日关于 sing-box 配置之束缚，可唤此令。",
    history_description: "📚 欲览往昔关于 sing-box 之谈，可唤此令。",
    switchmodel_description: "🔀 若欲求异源关于 sing-box 之慧，可于此请。",
      help_description: "❓ 迷途不知 sing-box 启迪之路？唤 /help，吾将示所有可唤之令。",
      choose_language: "🌐 择最适汝之凡语，以论 sing-box 之道。",
      choose_model: "🤖 择汝欲吾汲取关于 sing-box 配置之智慧之泉：",
      language_en: "🇬🇧 英语",
      language_zh: "🇨🇳 简体中文",
      command_not_found: "❓ 汝之令，超乎吾之理。唤 /help 求关于 sing-box 之指引，吾将示汝正咒。",
      unsupported_message: "😥 唉，吾无解图像与音声之能。明言汝关于 sing-box 之惑。",
      group_cooldown: "😥 纵为神思，亦需小憩。请待",
      seconds: "凡秒，再求吾关于 sing-box 配置之诲。",
      disclaimer: "\n\n⚠️ 吾虽力求 sing-box 配置之神谕精准，然命运之线，亦有缠结。凡人，当自行验明，免误入歧途。"
  },
};

export function translate(key: TranslationKey, language: SupportedLanguages = 'zh'): string {
  return translations[language]?.[key] || translations['zh'][key];
}
