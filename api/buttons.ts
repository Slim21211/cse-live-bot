import { Markup } from 'telegraf';

// В боевом режиме используется WEB_APP_URL из env
const webAppUrl = process.env.WEB_APP_URL || 'https://cse-live-bot.vercel.app';

export const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
} as const;

// Основное меню — inline-кнопки (callback)
export const topicButtons = Markup.inlineKeyboard([
  [
    Markup.button.callback(topics.news, 'select_news'),
    Markup.button.callback(topics.contest, 'select_contest'),
  ],
  [
    Markup.button.callback(topics.question, 'select_question'),
    Markup.button.callback(topics.idea, 'select_idea'),
  ],
]);

export const cancelButton = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Отмена', 'cancel')],
]);

export const sendMoreButton = Markup.inlineKeyboard([
  [Markup.button.callback('Отправить ещё', 'send_more')],
]);

export const contestTypeButtons = Markup.inlineKeyboard([
  [Markup.button.webApp('🎄 Детский новогодний конкурс', `${webAppUrl}/child`)],
  [
    Markup.button.webApp(
      '✨ Командный новогодний конкурс',
      `${webAppUrl}/team`
    ),
  ],
  [
    Markup.button.webApp(
      '⭐ Индивидуальный новогодний конкурс',
      `${webAppUrl}/individual`
    ),
  ],
  [Markup.button.callback('❌ Отмена', 'cancel')],
]);
