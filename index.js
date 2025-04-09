require('dotenv').config();
const { Telegraf } = require('telegraf');
const {
  topicButtons,
  cancelButton,
  sendMoreButton,
  topics
} = require('./buttons');

const token = process.env.TOKEN;
const bot = new Telegraf(token);

const ADMIN_IDS = process.env.ADMIN_IDS.split(',');

const userStates = new Map();

bot.start((ctx) => {
  userStates.delete(ctx.from.id);
  return ctx.reply('Привет! Сюда ты можешь прислать свою новость, включая текст, фотографии или видео (Укажи город, отдел, подразделение):', topicButtons);
});

bot.action(/select_(.+)/, async (ctx) => {
  const topicKey = ctx.match[1];
  const topicName = topics[topicKey]; // Получаем тему на русском

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
    await ctx.editMessageReplyMarkup();
    await ctx.reply('Отправка отменена.');
  } else {
    await ctx.answerCbQuery('Нет активной отправки.');
  }
});

bot.on(['text', 'photo', 'video'], async (ctx) => {
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

  const userCaption = ctx.message.caption || '';
  const extraCaption = `Предложение от @${ctx.from.username || ctx.from.first_name} (${state.topic}):`;
  const fullCaption = `${extraCaption}\n\n${userCaption}`;

  if (ctx.message.text) {
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendMessage(adminId, `${fullCaption}${ctx.message.text}`);
    }
  } else if (ctx.message.photo) {
    const file = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendPhoto(adminId, file, { caption: fullCaption });
    }
  } else if (ctx.message.video) {
    const file = ctx.message.video.file_id;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram.sendVideo(adminId, file, { caption: fullCaption });
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

bot.launch();
console.log('Бот запущен 🚀');
