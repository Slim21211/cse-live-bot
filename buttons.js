const { Markup } = require('telegraf');

const topics = {
  news: 'Новость',
  contest: 'Конкурс',
  question: 'Вопрос',
  idea: 'Идея',
};

const topicButtons = Markup.inlineKeyboard([
  [
    Markup.button.callback(topics.news, 'select_news'),
    Markup.button.callback(topics.contest, 'select_contest')
  ],
  [
    Markup.button.callback(topics.question, 'select_question'),
    Markup.button.callback(topics.idea, 'select_idea')
  ],
]);

const cancelButton = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Отмена', 'cancel')]
]);

const sendMoreButton = Markup.inlineKeyboard([
  [Markup.button.callback('📨 Отправить ещё новость', 'send_more')]
]);

module.exports = {
  topicButtons,
  cancelButton,
  sendMoreButton,
  topics
};
