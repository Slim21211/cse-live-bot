import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  topicButtons,
  cancelButton,
  sendMoreButton,
  getContestButtons,
  topics,
} from './buttons.js';

dotenv.config();

const token = process.env.TOKEN;
if (!token) throw new Error('TOKEN не найден');

const mode = process.env.MODE || 'production';
const admin_ids = process.env.ADMIN_IDS;
if (!admin_ids) throw new Error('ADMIN_IDS не найден');

// Supabase клиент для бота
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase не настроен, проверка участия не будет работать');
}

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const bot = new Telegraf(token);
const ADMIN_IDS = admin_ids.split(',').map((id) => id.trim());

type UserState = { topic: string; timeout: NodeJS.Timeout };
const userStates = new Map<number, UserState>();

// Проверка админа
const isAdmin = (userId: number): boolean => {
  return ADMIN_IDS.includes(String(userId));
};

// /start
bot.start((ctx) => {
  userStates.delete(ctx.from.id);
  return ctx.reply(
    'Привет! Сюда ты можешь прислать свою новость, включая текст, фотографии или видео (укажи город, отдел, подразделение):',
    topicButtons
  );
});

// Новость / Вопрос / Идея
bot.action(['select_news', 'select_question', 'select_idea'], async (ctx) => {
  if (!('data' in ctx.callbackQuery!)) return;

  const data = ctx.callbackQuery!.data!;
  const topicKey = data.replace('select_', '') as 'news' | 'question' | 'idea';
  const topicName = topics[topicKey];
  if (!topicName) return;

  userStates.set(ctx.from.id, {
    topic: topicName,
    timeout: setTimeout(() => {
      userStates.delete(ctx.from.id);
      ctx.telegram.sendMessage(ctx.from.id, 'Время вышло, отправка отменена.');
    }, 60 * 60 * 1000),
  });

  await ctx.answerCbQuery();

  try {
    await ctx.editMessageText(
      `Отправь ${topicName.toLowerCase()} (текст, фото, видео или документ).`,
      cancelButton
    );
  } catch {
    await ctx.reply(
      `Отправь ${topicName.toLowerCase()} (текст, фото, видео или документ).`,
      cancelButton
    );
  }
});

// Конкурс
bot.action('select_contest', async (ctx) => {
  await ctx.answerCbQuery();
  userStates.delete(ctx.from.id);

  const userId = ctx.from.id;
  const showVoting = isAdmin(userId); // Кнопка голосования только для админов

  await ctx.reply(
    'Выберите конкурс, в котором вы хотите принять участие:',
    getContestButtons(showVoting)
  );
});

// Проверка участия в конкурсах
bot.action('check_participation', async (ctx) => {
  await ctx.answerCbQuery();

  const userId = ctx.from.id;

  if (!supabase) {
    await ctx.reply('⚠️ Сервис временно недоступен. Попробуйте позже.');
    return;
  }

  try {
    // Проверяем участие во всех трёх конкурсах
    const [childResult, teamResult, individualResult] = await Promise.all([
      supabase
        .from('child_contest')
        .select('title, child_name')
        .eq('telegram_user_id', userId)
        .eq('is_active', true),
      supabase
        .from('team_contest')
        .select('title')
        .eq('telegram_user_id', userId)
        .eq('is_active', true),
      supabase
        .from('individual_contest')
        .select('title')
        .eq('telegram_user_id', userId)
        .eq('is_active', true),
    ]);

    const childWorks = childResult.data || [];
    const teamWorks = teamResult.data || [];
    const individualWorks = individualResult.data || [];

    const totalWorks =
      childWorks.length + teamWorks.length + individualWorks.length;

    if (totalWorks === 0) {
      const showVoting = isAdmin(userId);
      await ctx.reply(
        '📭 Вы пока не участвуете ни в одном конкурсе.\n\n' +
          'Выберите конкурс, в котором вы хотели бы принять участие!',
        getContestButtons(showVoting)
      );
      return;
    }

    // Формируем сообщение с работами
    let message = '🎉 Вы участвуете в конкурсах!\n\n';

    if (childWorks.length > 0) {
      message += '🎄 *Детский новогодний конкурс:*\n';
      childWorks.forEach((work, i) => {
        message += `   ${i + 1}. "${work.title}" (${work.child_name})\n`;
      });
      message += '\n';
    }

    if (teamWorks.length > 0) {
      message += '✨ *Командный новогодний конкурс:*\n';
      teamWorks.forEach((work, i) => {
        message += `   ${i + 1}. "${work.title}"\n`;
      });
      message += '\n';
    }

    if (individualWorks.length > 0) {
      message += '⭐ *Индивидуальный новогодний конкурс:*\n';
      individualWorks.forEach((work, i) => {
        message += `   ${i + 1}. "${work.title}"\n`;
      });
      message += '\n';
    }

    message += `📊 Всего работ: ${totalWorks}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Error checking participation:', err);
    await ctx.reply('⚠️ Ошибка при проверке участия. Попробуйте позже.');
  }
});

// Отмена
bot.action('cancel', async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (state) clearTimeout(state.timeout);
  userStates.delete(ctx.from.id);

  await ctx.answerCbQuery();
  await ctx.reply(
    'Отправка отменена. Выберите дальнейшее действие',
    topicButtons
  );
});

// Контент от пользователя
bot.on(['text', 'photo', 'video', 'document'], async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) {
    return ctx.reply('Сначала выбери тип сообщения:', topicButtons);
  }

  clearTimeout(state.timeout);
  userStates.delete(ctx.from.id);

  const message = ctx.message!;
  const from = ctx.from!;
  const username = from.username
    ? `@${from.username}`
    : from.first_name || 'Пользователь';
  const topic = state.topic;
  const baseCaption = `${topic} от ${username}:`;

  try {
    if ('text' in message) {
      const text = `${baseCaption}\n\n${message.text}`;
      for (const id of ADMIN_IDS) await ctx.telegram.sendMessage(id, text);
    } else if ('photo' in message) {
      const fileId = message.photo!.at(-1)!.file_id;
      const caption = message.caption
        ? `${baseCaption}\n\n${message.caption}`
        : baseCaption;
      for (const id of ADMIN_IDS)
        await ctx.telegram.sendPhoto(id, fileId, { caption });
    } else if ('video' in message) {
      const fileId = message.video!.file_id;
      const caption = message.caption
        ? `${baseCaption}\n\n${message.caption}`
        : baseCaption;
      for (const id of ADMIN_IDS)
        await ctx.telegram.sendVideo(id, fileId, { caption });
    } else if ('document' in message) {
      const fileId = message.document!.file_id;
      const caption = message.caption
        ? `${baseCaption}\n\n${message.caption}`
        : baseCaption;
      for (const id of ADMIN_IDS)
        await ctx.telegram.sendDocument(id, fileId, { caption });
    }

    await ctx.reply(
      'Спасибо! Сообщение отправлено администратору.',
      sendMoreButton
    );
  } catch (err) {
    console.error(err);
    await ctx.reply('Ошибка при отправке. Попробуй позже.');
  }
});

// Отправить ещё
bot.action('send_more', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Что хочешь отправить ещё?', topicButtons);
});

// Локальный polling
if (mode === 'local') {
  bot.launch();
  console.log('Бот запущен в режиме polling');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } catch (e) {
      console.error(e);
      return res.status(500).send('Error');
    }
  }
  return res.status(200).send('Bot alive');
}
