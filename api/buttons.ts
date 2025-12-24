import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/types';

const webAppUrl = process.env.WEB_APP_URL || 'https://cse-live-bot.vercel.app';

export const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
} as const;

const RESULTS_DEADLINE = new Date('2025-12-26T10:00:00+03:00');
const isResultsOpen = new Date() > RESULTS_DEADLINE;

// Основное меню
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

export const getContestButtons = (showVoting: boolean) => {
  const buttons: InlineKeyboardButton[][] = [];

  if (isResultsOpen || showVoting) {
    buttons.push([
      Markup.button.webApp('Результаты конкурса', `${webAppUrl}/results`),
    ]);
  }

  buttons.push([Markup.button.callback('❌ Отмена', 'cancel')]);

  return Markup.inlineKeyboard(buttons);
};
