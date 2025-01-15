// src/utils/helpers.ts
import { Env } from '../env';

export function formatCodeBlock(code: string, language: string): string {
  // 移除多余的空行和空格，但保留代码缩进
  const trimmedCode = code.trim()
  .replace(/^\n+|\n+$/g, '')
  .replace(/\n{3,}/g, '\n\n'); // 将多个空行压缩为最多两个

  // 使用语言tag包裹代码块，以便Telegram正确解析
  return `\n<pre><code class="language-${language}">${escapeHtml(trimmedCode)}</code></pre>\n`;
}

export function formatMarkdown(text: string): string {
  let processedText = text.replace(/```(\w*)\n?([\s\S]+?)```/g, (_, lang, code) => {
    return formatCodeBlock(code, lang || ''); // 直接使用 formatCodeBlock 处理代码块
  });

  // 处理其他 Markdown 元素
  processedText = processedText
  .replace(/\*{2,3}([^*]+)\*{2,3}/g, '*$1*')
  .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
  .replace(/^(\s*)-\s+(.+)$/gm, '$1• $2')
  .replace(/^>\s*(.+)$/gm, '▎ _$1_')
  .replace(/([^\s`])`([^`]+)`([^\s`])/g, '$1 `$2` $3');

  // return processedText;
  //还原代码块，并确保它们的格式正确
  processedText = processedText.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    const block = codeBlocks[parseInt(index)];
    return block.replace(/```(\w*)\n?([\s\S]+?)```/g, (_, lang, code) => {
      return formatCodeBlock(code, lang || '');
    });
  });

  return processedText;
}

export function formatHtml(text: string): string {
  return text
  .replace(/&/g, '&')
  .replace(/</g, '<')
  .replace(/>/g, '>')
  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
  .replace(/\*(.*?)\*/g, '<i>$1</i>')
  .replace(/`(.*?)`/g, '<code>$1</code>')
  .replace(/```(\w*)\n([\s\S]+?)```/g, (_, lang, code) =>
  `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`
  )
  .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(text: string): string {
  return text
  .replace(/&/g, "&")
  .replace(/</g, "<")
  .replace(/>/g, ">")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "'");
}

export function stripFormatting(text: string): string {
  // 保存代码块
  const codeBlocks: string[] = [];
  let processedText = text.replace(/```[\s\S]+?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 处理其他格式
  processedText = processedText
  .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/\*(.*?)\*/g, '$1')
  .replace(/`(.*?)`/g, '$1')
  .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)')

  // 还原代码块，但保持原始格式
  return processedText.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[parseInt(index)];
  });
}


export function splitMessage(text: string, maxLength: number = 4096): string[] {
  const messages: string[] = [];

  // 改进代码块检测，确保代码块完整
  const parts = text.split(/(```[\s\S]*?```)/);
  let currentMessage = '';

  for (const part of parts) {
    if (part.startsWith('```')) {
      if (currentMessage.length + part.length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = '';
        }
        messages.push(part);
      } else {
        currentMessage += part;
      }
    } else {
      const lines = part.split('\n');
      for (const line of lines) {
        if (currentMessage.length + line.length + 1 > maxLength) {
          if (currentMessage) {
            messages.push(currentMessage.trim());
            currentMessage = '';
          }
          currentMessage = line;
        } else {
          currentMessage += (currentMessage ? '\n' : '') + line;
        }
      }
    }
  }

  if (currentMessage) {
    messages.push(currentMessage.trim());
  }

  return messages;
}


export async function sendChatAction(chatId: number, action: string, env: Env): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendChatAction`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      action: action,
    }),
  });
}
