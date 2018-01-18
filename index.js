const httpRequest = require("request")
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

module.exports = (robot) => {
  // Your code here
  console.log('Yay, slack message bot loaded!')

  robot.on('release', onRelease);
  robot.on('issues', onIssues);
}


async function onRelease(context) {
  slackMessgae(context.payload.release.body);
}
async function onIssues(context) {
  slackMessgae(context.payload.issue.body);
}

async function slackMessgae(body) {
  const messgaes = extractSlackMessages(body);
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

function sendSlackMessage(messgaes) {
  messgaes.forEach((message) => {
    const notifyPrefix = '<@';
    const notifyPostfix = '>';
    const slackPayloadObj = {};

    const userNotify = message.users.map((user) => {
      return `${notifyPrefix}${user}${notifyPostfix}`;
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
