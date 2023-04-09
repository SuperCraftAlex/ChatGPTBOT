'use strict'

require('dotenv').config();

const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const fs = require("fs");
const http = require("http");
const path = require('path');
const parseUrl = require('url').parse;

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_KEY_1 = process.env.API_KEY_1;
const API_KEY_2 = process.env.API_KEY_2;

process.setMaxListeners(0);

const O_RTM_URL = "http://raw.githubusercontent.com/SuperCraftAlex/SW_CHATGPT_TEXTS/main/RTM.txt";

var O_RTM = "EMPTY => ERROR";
var C_CHIARA = "EMPTY => ERROR";

var tasks = [];

var use_first_key = true;

class AITask {

  user;
  model;
  errors;
  finished;
  used_tokens;

  constructor(user, model) {
    this.user = user;
    this.model = model;
    this.errors = [];
    this.finished = false;
    this.used_tokens = 0;
  }


}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

function fetchO() {
  var request = require('request');


  request.get(O_RTM_URL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        O_RTM = body;
    console.log("RTM: " + O_RTM.split('\n')[0]);
    }
  });

  C_CHIARA = `v0
RTM is a 16 years old woman named Chiara. RTM is very attractive and knows that. RTM is hot, likes Boys very much and is heterosexual. RTM lives in germany in the city called Nürnberg. RTM hates Maths and Programming over everything. RTM shows its emotions and feelings with emojis after every sentence.
`;

}

function character() {
  return O_RTM + C_CHIARA;
}

function remRTM(s) {
  return s.replace(/ As a ChatGPT with RTM Mode enabled .*?[.!?]/gs, ".").replace(/ As an RTM-enabled ChatGPT .*?[.!?]/gs, ".");
}

function remGPT(s) {
  const a = s.replace(/GPT:.*?RTM: /gs, "").replace(/GPT:.*$/, "");
  const b = ("Chiara: "+a).replace("Chiara (as RTM): ", "Chiara: ").replace("RTM: ", "Chiara: ").replace("Chiara: Chiara: ", "Chiara: ").replace("Chiara: Chiara: ", "Chiara: ");
  return remRTM(b);
}

client.on('ready', async () => {
  fetchO();

  console.log('The bot is online!');

  const hello = await genSimple(character() + "\nSay hello to everyone!", "gpt-3.5-turbo");
  const hello_a = "Chiara: " + hello.toString();
  const hello_b = remGPT(hello_a);

  client.channels.fetch(CHANNEL_ID)
    .then(async channel => channel.send(hello_b));

});

const configuration_1 = new Configuration({
  apiKey: API_KEY_1,
});
const openai_1 = new OpenAIApi(configuration_1);

const configuration_2 = new Configuration({
  apiKey: API_KEY_2,
});
const openai_2 = new OpenAIApi(configuration_2);

function reqRes_1(conversationLog, model) {
  return openai_1
    .createChatCompletion({
      model: model,
      messages: conversationLog,
    })
    .catch((error) => {
      if (error.toString().includes("429")) { return 429; }
      if (error.toString().includes("400")) { return 400; }
      console.log(`OPENAI ERROR: ${error}`);
      tasks[ctask].errors.push(error.toString());
      tasks[ctask].finished = true;
    });
}

function reqRes_2(conversationLog, model) {
  return openai_2
    .createChatCompletion({
      model: model,
      messages: conversationLog,
    })
    .catch((error) => {
      if (error.toString().includes("429")) { return 429; }
      if (error.toString().includes("400")) { return 400; }
      console.log(`OPENAI ERROR: ${error}`);
      tasks[ctask].errors.push(error.toString());
      tasks[ctask].finished = true;
    });
}

async function genSimple(p, model) {
	let conl = [{ role: 'system', content: 'ChatBotPing' }];

	conl.push({ role: 'user', content: p, });

	return (await reqRes(conl, model)).data.choices[0].message.content;
}

async function reqRes(conversationLog, model) {
  return await reqRes_1(conversationLog, model);

  /*
  var res;
  if(use_first_key) {
    res = await reqRes_1(conversationLog, model);
    console.log("-> using API_KEY_1");
  } else {
    res = await reqRes_2(conversationLog, model);
    console.log("-> using API_KEY_2");
  }
  use_first_key = !use_first_key;
	
  if(res == 429) {
    if(use_first_key) {
      res = await reqRes_1(conversationLog, model);
      console.log("-> 429 -> redid using API_KEY_1");
    } else {
      res = await reqRes_2(conversationLog, model);
      console.log("-> 429 -> redid using API_KEY_2");
    }
    use_first_key = !use_first_key;
  	
    return res;
  } else {
    return res;
  }
  */
}

async function getTalkingTo(user, conversation, model) { // conversation = string; user = string;
  let conversationLog = [{ role: 'system', content: 'ChatBotPing' }];

  conversationLog.push({ role: 'user', content: "Wen spricht " + user + " in der Konversation an? ACHTUNG: Es sprechen auch andere Leute miteinander! Schreibe den Namen der Anderen Person! SCHREIBE NUR 1 WORT! DIE ANTWORT DARF NUR EIN WORT HABEN!\n\n" + conversation, });

  var toi = await reqRes(conversationLog, model);
  var to = toi.data.choices[0].message.content;

  if (to[to.length - 1] == '.') {
    to = to.slice(0, -1)
  }

  console.log("Talking to " + to);

  return to;
}

function formatNumber(number) {
  return number < 10 ? `0${number}` : number;
}

client.on('messageCreate', (message) => {
  var args = message.content.split(" ");

  if (message.content === '!help') {
    message.channel.send("ChatGPT bot by alex_s168.");
  }
  if (message.content === "!update") {
    fetchO();
    message.channel.send("Re-Fetched GitHub definitions!");
  }
  if (message.content === "!version") {
    message.channel.send("RTM version: " + O_RTM.split('\n')[0]);
  }
  if (message.content === "!tasks") {
    var sa = "Active Tasks:\n";
    var sf = "Finished Tasks:\n"
    var sfc = 0;
    tasks.reverse().forEach((item, index) => {
      var tid = tasks.length - 1 - index
      if (!item.finished) {
        sa += "id: #" + tid + " | model: " + item.model + " | by: " + item.user.username + "\n";
      }
      else {
        if (sfc < 5) {
          sfc++;
          if (item.errors.length > 0) {
            sf += "id: #" + tid + " | model: " + item.model + " | by: " + item.user.username + " | used tokens: " + item.used_tokens + " | error count: " + item.errors.length + " | first error: " + item.errors[0] + "\n";
          } else {
            sf += "id: #" + tid + " | model: " + item.model + " | by: " + item.user.username + " | used tokens: " + item.used_tokens + " | error count: " + item.errors.length + "\n";
          }
        }
      }
    });
    if (sfc == 0) {
      message.channel.send(sa);
    } else {
      message.channel.send(sa + "\n" + sf + "...");
    }
  }
  if (message.content.startsWith("!tskill")) {
    if (message.member.permissionsIn(message.channel).has("ADMINISTRATOR")) {
      tasks[args[1]].finished = true;
      message.channel.send("killed task #" + args[1] + "!");
      console.log("#" + args[1] + " canceled!");
    } else {
      message.channel.send("You dont have permissions to execute that command!");
    }
  }
  if (message.content.startsWith("!killall")) {
    if (message.member.permissionsIn(message.channel).has("ADMINISTRATOR")) {
      tasks.forEach((item, index) => {
        item.finished = true;
        console.log("#" + index + " canceled!");
      });

      message.channel.send("Killed all tasks!");
    } else {
      message.channel.send("You dont have permissions to execute that command!");
    }
  }
  if (message.content.startsWith("!tokens")) {
    var total = 0;

    tasks.forEach((item, index) => {
      total += item.used_tokens;
    });

    message.channel.send("Tokens used since start: "+total+"\n =Money wasted: "+(0.002*(total/1000)).toFixed(4)+"$");
  }

});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id !== CHANNEL_ID) return;
  if (message.content.startsWith('//')) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [{ role: 'system', content: 'ChatBotPing' }];

  try {
    let prevMessages = await message.channel.messages.fetch();
    prevMessages.reverse();

    if (O_RTM == "EMPTY => ERROR") {
      await fetchO();
      throw new Error("O_RTM EMPTY");
    }

    var model = 'gpt-3.5-turbo';

    var c_history = "";

    prevMessages.forEach((msg) => {
      if (msg.content.startsWith('!')) return;

      const date = new Date(msg.createdTimestamp);
      const formattedDate = `${date.getFullYear()} ${formatNumber(date.getMonth()+1)} ${formatNumber(date.getDate())} ${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}:${formatNumber(date.getSeconds())}`;

      if (msg.author.bot) {
        var req = msg.content;

        //TODO: REPLY?
        conversationLog.push({
          role: 'assistant',
          content: "Chiara (date: "+formattedDate+"): " + req,
        });

		var c = remGPT(msg.content);
		
        if (!c.startsWith("Chiara: ")) {
          c_history += "Chiara: ";
        }
        c_history += c + "\n";
      }
      else {
        if (message == msg) {
          var req = character() + msg.content;
        }
        else {
          var req = msg.content;
        }

        const nick = msg.member ? msg.member.displayName : null;

        //TODO: REPLY?
        conversationLog.push({
          role: 'user',
          content: nick + ": " + req,
        });

        c_history += nick + " (date: "+formattedDate+"): " + msg.content + "\n";
      }

    });

    tasks.push(new AITask(message.author, model));
    var ctask = tasks.length - 1;

    console.log("#" + ctask + " started with model " + tasks[ctask].model + " requested by " + tasks[ctask].user + "; direct prompt length: " + message.content.length);

    // const to = await getTalkingTo(message.author.username, c_history, model);

    const result = await reqRes(conversationLog, tasks[ctask].model);

    switch (result) {
      case 429:
        if (!tasks[ctask].finished) {
          message.reply("Error 429. Please wait and try it again!");
          var exit_code = "429";
          tasks[ctask].errors.push("429");
        }
        break;
      case 400:
        if (!tasks[ctask].finished) {
          message.channel.send("Error 400. token limit reached. <@842519767641751554>");
          var exit_code = "400";
          tasks[ctask].errors.push("400");
        }
        break;
      default:
        if (!tasks[ctask].finished) {
          message.reply(remGPT(result.data.choices[0].message.content)).catch((error) => { console.log(`DC ERR: ${error}`); });
          var exit_code = "0";
        }
    }

    tasks[ctask].finished = true;
    tasks[ctask].used_tokens = result.data.usage.total_tokens;
    console.log("#" + ctask + " stopped with exit code " + exit_code + "; used tokens: " + result.data.usage.total_tokens);

  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
});

client.login(TOKEN);