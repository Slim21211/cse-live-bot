import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import {
  topicButtons,
  cancelButton,
  sendMoreButton,
  topics,
  TopicKey
} from './buttons';

dotenv.config();

const token = process.env.TOKEN;
const mode = process.env.MODE || 'production';
const admin_ids = process.env.ADMIN_IDS;

if (!token || !admin_ids) {
  throw new Error('BOT_TOKEN не найден');
}

export const bot = new Telegraf(token);

const ADMIN_IDS = admin_ids.split(',');

type UserState = {
  topic: string;
  timeout: ReturnType<typeof setTimeout>;
};

const userStates = new Map<number, UserState>();

bot.start((ctx) => {
  userStates.delete(ctx.from.id);
  return ctx.reply(
    'Привет! Сюда ты можешь прислать свою новость, включая текст, фотографии или видео (Укажи город, отдел, подразделение):',
    topicButtons
  );
});

bot.action(/select_(.+)/, async (ctx) => {
  const topicKey = ctx.match[1] as TopicKey;
  const topicName = topics[topicKey];

  userStates.set(ctx.from.id, {
    topic: topicName,
    timeout: setTimeout(() => {
      userStates.delete(ctx.from.id);
      ctx.telegram.sendMessage(ctx.from.id, '⏰ Время вышло, отправка отменена.');
    }, 60 * 60 * 1000),
  });

  await ctx.answerCbQuery();
  await ctx.reply(
    `Отправь свою ${topicName.toLowerCase()} (текст, фото или видео).`,
    cancelButton
  );
});

bot.action('cancel', async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (state) {
    clearTimeout(state.timeout);
    userStates.delete(ctx.from.id);
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply('Отправка отменена.');
  } else {
    await ctx.answerCbQuery('Нет активной отправки.');
  }
});

bot.on(['text', 'photo', 'video', 'document'], async (ctx) => {
  const state = userStates.get(ctx.from.id);

  if (!state) {
    await ctx.reply(
      'Чтобы отправить сообщение, сначала выбери тип предложения и введите свою новость:',
      topicButtons
    );
    return;
  }

  clearTimeout(state.timeout);
  userStates.delete(ctx.from.id);

  const message = ctx.message;
  const from = ctx.from;
  const username = from.username || from.first_name || 'пользователь';
  const topic = state.topic;
  const baseCaption = `Предложение от @${username} (${topic}):`;

  if ('text' in message) {
    const fullText = `${baseCaption}\n\n${message.text}`;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendMessage(adminId, fullText);
    }
  } else if ('photo' in message) {
    const fileId = message.photo[message.photo.length - 1].file_id;
    const caption = `${baseCaption}\n\n${message.caption || ''}`;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendPhoto(adminId, fileId, { caption });
    }
  } else if ('video' in message) {
    const fileId = message.video.file_id;
    const caption = `${baseCaption}\n\n${message.caption || ''}`;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendVideo(adminId, fileId, { caption });
    }
  } else if ('document' in message) {
    const fileId = message.document.file_id;
    const caption = `${baseCaption}\n\n${message.caption || ''}`;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendDocument(adminId, fileId, { caption });
    }
  }

  await ctx.reply(
    'Спасибо! Ваше сообщение отправлено администратору.',
    sendMoreButton
  );
});

bot.action('send_more', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Что хочешь отправить ещё?', topicButtons);
});

if (mode === 'local') {
  bot.launch();
  console.log('Бот запущен в режиме polling');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
