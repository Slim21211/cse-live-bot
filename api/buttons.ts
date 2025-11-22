import { Markup } from 'telegraf';

const webAppUrl = process.env.WEB_APP_URL || 'https://cse-live-bot.vercel.app';

export const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
} as const;

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
// isAdmin - показывать ли кнопку голосования
export const getContestButtons = (showVoting: boolean) => {
  const buttons = [
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
    ],
    [Markup.button.callback('📋 Проверить моё участие', 'check_participation')],
  ];

  // Кнопка голосования только для админов (пока идёт сбор работ)
  if (showVoting) {
    buttons.push([
      Markup.button.webApp('🗳 Перейти к голосованию', `${webAppUrl}`),
    ]);
  }

  buttons.push([Markup.button.callback('❌ Отмена', 'cancel')]);

  return Markup.inlineKeyboard(buttons);
};
