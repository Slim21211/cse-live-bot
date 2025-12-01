import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TOKEN!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: string[] = [];

  try {
    // Тест 1: getChat
    results.push('=== TEST 1: getChat ===');
    try {
      const chat = await bot.telegram.getChat(-1001863192367);
      results.push(`✅ Chat found: ${JSON.stringify(chat)}`);
    } catch (e: any) {
      results.push(`❌ getChat failed: ${e.message}`);
    }

    // Тест 2: getChatAdministrators
    results.push('\n=== TEST 2: getChatAdministrators ===');
    try {
      const admins = await bot.telegram.getChatAdministrators(-1001863192367);
      results.push(`✅ Admins: ${JSON.stringify(admins)}`);
    } catch (e: any) {
      results.push(`❌ getChatAdministrators failed: ${e.message}`);
    }

    // Тест 3: getMe (проверка бота)
    results.push('\n=== TEST 3: getMe ===');
    const me = await bot.telegram.getMe();
    results.push(`✅ Bot: ${JSON.stringify(me)}`);

    return res.status(200).json({
      success: true,
      results: results.join('\n'),
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message,
      results: results.join('\n'),
    });
  }
}
