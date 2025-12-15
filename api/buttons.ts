import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/types';

const webAppUrl = process.env.WEB_APP_URL || 'https://cse-live-bot.vercel.app';

export const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
} as const;

// 🆕 Дата окончания приема работ
const SUBMISSION_DEADLINE = new Date('2025-12-15T00:00:00+03:00'); // МСК
const isContestOpen = new Date() < SUBMISSION_DEADLINE;

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

// Функция для создания кнопок конкурса
export const getContestButtons = (showVoting: boolean) => {
  const buttons: InlineKeyboardButton[][] = [];

  // 🆕 Кнопки для подачи заявок - только если прием открыт
  if (isContestOpen) {
    buttons.push(
      [
        Markup.button.webApp(
          '🎄 Детский новогодний конкурс',
          `${webAppUrl}/child-form`
        ),
      ],
      [
        Markup.button.webApp(
          '✨ Командный новогодний конкурс',
          `${webAppUrl}/team-form`
        ),
      ],
      [
        Markup.button.webApp(
          '⭐ Индивидуальный новогодний конкурс',
          `${webAppUrl}/individual-form`
        ),
      ]
    );
  }

  // Кнопка проверки участия - всегда доступна
  buttons.push([
    Markup.button.callback('📋 Проверить моё участие', 'check_participation'),
  ]);

  // 🆕 Кнопка голосования - только для админов (пока showVoting = true)
  // Потом вручную измените на просто: if (true) или уберите условие
  buttons.push([
    Markup.button.webApp('🗳 Перейти к голосованию', `${webAppUrl}`),
  ]);

  // Кнопка отмены - всегда в конце
  buttons.push([Markup.button.callback('❌ Отмена', 'cancel')]);

  return Markup.inlineKeyboard(buttons);
};
