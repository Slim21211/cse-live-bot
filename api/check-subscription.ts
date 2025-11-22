import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TOKEN!);
const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL || '@your_channel'; // Например: @cse_contests

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_user_id } = req.body;

    if (!telegram_user_id) {
      return res.status(400).json({ error: 'telegram_user_id required' });
    }

    // Проверяем подписку на канал
    const member = await bot.telegram.getChatMember(
      REQUIRED_CHANNEL,
      telegram_user_id
    );
    const isSubscribed = ['member', 'administrator', 'creator'].includes(
      member.status
    );

    return res.status(200).json({ isSubscribed });
  } catch (err) {
    console.error('Check subscription error:', err);
    return res.status(500).json({
      error: 'Ошибка проверки подписки',
      isSubscribed: false,
    });
  }
}
