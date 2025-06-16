import { Markup } from 'telegraf'

export const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
} as const;

export type TopicKey = keyof typeof topics;

export const topicButtons = Markup.inlineKeyboard([
  [
    Markup.button.callback(topics.news, 'select_news'),
    Markup.button.callback(topics.contest, 'select_contest')
  ],
  [
    Markup.button.callback(topics.question, 'select_question'),
    Markup.button.callback(topics.idea, 'select_idea')
  ],
]);

export const cancelButton = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Отмена', 'cancel')]
]);

export const sendMoreButton = Markup.inlineKeyboard([
  [Markup.button.callback('📨 Отправить ещё новость', 'send_more')]
]);
