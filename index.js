const httpRequest = require("request")
const slackWebhookUrl = process.env.SLACK_MESSAGE_WEBHOOK_URL;
const slackToken = process.env.SLACK_TOKEN;
const { findIndex } = require('lodash');

module.exports = (robot) => {
  console.log('[slack message bot]: ON!')

  robot.on('release', slackMessageBotOnRelease);
  robot.on('issues.opened', slackMessageBotOnIssues);
  robot.on('issue_comment', slackMessageBotOnIssueComment);
}

async function slackMessageBotOnIssueComment(context) {
  slackMessgae(context.payload.comment.body);
}

module.exports.slackMessageBotOnIssueComment = slackMessageBotOnIssueComment

async function slackMessageBotOnRelease(context) {
  slackMessgae(context.payload.release.body);
}

module.exports.slackMessageBotOnRelease = slackMessageBotOnRelease

async function slackMessageBotOnIssues(context) {
  slackMessgae(context.payload.issue.body);
}

module.exports.slackMessageBotOnIssues = slackMessageBotOnIssues

async function slackMessgae(body) {
  const messgaes = extractSlackMessages(body);
  if (!messgaes.length) {
    console.log('[slack message bot]: no message, skip.');
    return;
  }
  sendSlackMessage(messgaes);
}
  
function extractSlackMessages(body) {
  const lines = body.split(/\n/).map(line => line.trim());
  return lines.filter((line) => {
    return line.startsWith('/slack');
  }).map((message) => {
    return {
      users: extractSlackMessageUser(message),
      content: extractSlackMessageContent(message),
    }
  })
}

function extractSlackMessageContent(message) {
  const slackContent = message.replace(/^\/slack\s+/, '').match(/^(?:\[.*?\])(.*)/);
  if (slackContent) {
    return slackContent[1];
  }
  return null;
}

function extractSlackMessageUser(message) {
  const slackUsers = message.replace(/^\/slack\s+/, '').match(/\[(.)*\]/);
  if (slackUsers) {
    return slackUsers[0].substring(1, slackUsers[0].length - 1).split(/\s+/);
  }
  return [];
}

async function getSlackUsers() {
  return new Promise((resolve, reject) => {
    httpRequest.get('https://slack.com/api/users.list', {
      "headers": {
        "Authorization": "Bearer " + slackToken
      }
    }, (err, httpResponse, body) => {
      if(err){
        console.error(err);
        reject(err);
      }
      resolve(JSON.parse(body).members);
    });
  })
}

function getSlackUserId(users, user) {
  const userIndex = findIndex(users, {
    real_name: user
  });
  if (userIndex !== -1) {
    return users[userIndex].id;
  }
  return null;
}

async function sendSlackMessage(messgaes) {
  const SlackUsers = await getSlackUsers();

  messgaes.forEach((message) => {
    const notifyPrefix = '<@';
    const notifyPostfix = '>';
    const slackPayloadObj = {};
    
    const userNotify = message.users.map((user) => {
      const userId = getSlackUserId(SlackUsers, user);
      return `${notifyPrefix}${userId ? userId : user}${notifyPostfix}`;
    }).join(' ');

    slackPayloadObj.text = `${userNotify} ${message.content}`;

    httpRequest.post(slackWebhookUrl, {
      form: {
        payload:JSON.stringify(slackPayloadObj)
      }
    }, (err, httpResponse, body) => {
      if(err){
        console.error(err);
      }
    });
  })
}
