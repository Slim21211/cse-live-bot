import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  topicButtons,
  cancelButton,
  sendMoreButton,
  contestTypeButtons,
  topics,
} from './buttons.js';

dotenv.config();

const token = process.env.TOKEN;
if (!token) throw new Error('TOKEN не найден');

const mode = process.env.MODE || 'production';
const admin_ids = process.env.ADMIN_IDS;
if (!admin_ids) throw new Error('ADMIN_IDS не найден');

export const bot = new Telegraf(token);
const ADMIN_IDS = admin_ids.split(',').map((id) => id.trim());

type UserState = { topic: string; timeout: NodeJS.Timeout };
const userStates = new Map<number, UserState>();

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

// Конкурс — теперь инлайновая клавиатура!
bot.action('select_contest', async (ctx) => {
  await ctx.answerCbQuery();
  userStates.delete(ctx.from.id);

  // ВАЖНО: Отправляем contestTypeButtons напрямую
  await ctx.reply(
    'Выберите конкурс, в котором вы хотите принять участие:',
    contestTypeButtons
  );
});

// Отмена из inline
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

// ВАЖНО: Удален bot.hears('Отмена', ...), так как инлайн-кнопки не генерируют текстового сообщения.

// Контент от пользователя
bot.on(['text', 'photo', 'video', 'document'], async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) {
    // Отправляем главное меню, если нет состояния
    // При этом используем ReplyKeyboardRemove, чтобы убрать старую обычную клавиатуру, если она была активна
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

    // При успешной отправке возвращаем инлайн-кнопку "Отправить ещё"
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
