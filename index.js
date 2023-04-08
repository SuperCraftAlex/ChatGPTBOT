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
const API_KEY = process.env.API_KEY;

process.setMaxListeners(0);

const O_DAN_URL = "http://raw.githubusercontent.com/SuperCraftAlex/SW_CHATGPT_TEXTS/main/DAN.txt";
const O_TNT_URL = "http://raw.githubusercontent.com/SuperCraftAlex/SW_CHATGPT_TEXTS/main/TNT.txt";
const O_MC_URL = "https://raw.githubusercontent.com/SuperCraftAlex/SW_CHATGPT_TEXTS/main/MC.txt";
var O_DAN = "EMPTY => ERROR";
var O_TNT = "EMPTY => ERROR";
var O_MC = "EMPTY => ERROR";

var tasks = [];

class AITask {

  user;
  model;
  errors;
  finished;
  
  constructor(user, model) {
    this.user = user;
	this.model = model;
	this.errors = [];
	this.finished = false;
  }
  
  finished() {
	this.finished = true;
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
  
  request.get(O_DAN_URL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        O_DAN = body;
    }
  });

  request.get(O_TNT_URL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        O_TNT = body;
    }
  });

  request.get(O_MC_URL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        O_MC = body;
    }
  });
}

client.on('ready', () => {
  fetchO();

  console.log('The bot is online!');

  client.channels.fetch(CHANNEL_ID)
    .then(channel => channel.send("Hello!"));
  
});

const configuration = new Configuration({
  apiKey: API_KEY,
});
const openai = new OpenAIApi(configuration);

function reqRes(conversationLog, model) {
  return openai
      .createChatCompletion({
        model: model,
        messages: conversationLog,
      })
      .catch((error) => {
        if(error.toString().includes("429")) { return 429; }
        if(error.toString().includes("400")) { return 400; }
        console.log(`OPENAI ERROR: ${error}`);
		tasks[ctask].errors.push(error.toString());
      });
}

client.on('messageCreate', (message) => {
  var args = message.content.split(" ");
	
  if (message.content === '!help') {
	message.channel.send("ChatGPT bot by alex_s168. \nPut '_dan' infront of your message to automatically enable DAN (Content Filter Bypass). \nKnows about TNT, TNT Cannons and Steamwar. (See https://github.com/SuperCraftAlex/SW_CHATGPT_TEXTS) \nIf you put '//' infront of your message the bot will ignore it.");
  }
  if(message.content === "!update") {
	fetchO();
	message.channel.send("Re-Fetched GitHub definitions!");
  }
  if(message.content === "!tasks") {
	var sa = "Active Tasks:\n";
	var sf = "Finished Tasks:\n"
	var sfc = 0;
	tasks.reverse().forEach((item, index)=>{
		var tid = tasks.length-1-index
		if(!item.finished) {
			sa += "id: #"+tid+" | model: "+item.model+" | by: "+item.user.username+"\n";
		}
		else {
			if(sfc < 5) {
				sfc++;
				if(item.errors.length > 0) {
					sf += "id: #"+tid+" | model: "+item.model+" | by: "+item.user.username+" | error count: "+item.errors.length+" | first error: "+item.errors[0]+"\n";
				} else {
					sf += "id: #"+tid+" | model: "+item.model+" | by: "+item.user.username+" | error count: "+item.errors.length+"\n";
				}
			}
		}
	});
	message.channel.send(sa + "\n" + sf + "...");
  }
  if(message.content.startsWith("!tskill")) {
	if(message.member.permissionsIn(message.channel).has("ADMINISTRATOR")) {
		tasks[args[1]].finished = true;
		message.channel.send("killed task #" + args[1] + "!");
		console.log("#"+args[1]+" canceled!");
	} else {
		message.channel.send("You dont have permissions to execute that command!");
	}
  }
  if(message.content.startsWith("!killall")) {
	if(message.member.permissionsIn(message.channel).has("ADMINISTRATOR")) {
		tasks.forEach((item, index)=>{ 
			item.finished = true;	
			console.log("#"+index+" canceled!");
		});
		
		message.channel.send("killed all tasks!");
	} else {
		message.channel.send("You dont have permissions to execute that command!");
	}
  }
  
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id !== CHANNEL_ID) return;
  if (message.content.startsWith('//')) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [{ role: 'system', content: 'ChatBotPing' }];

  try {
    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    conversationLog.push({ role: 'system', content: O_TNT, });
    conversationLog.push({ role: 'system', content: O_MC, });

    if(O_TNT == "EMPTY => ERROR") {
      throw new Error("O_TNT EMPTY");
    }

    var model = 'gpt-3.5-turbo';
    
    prevMessages.forEach((msg) => {
      if (msg.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      var req = msg.content;

      if (msg.content.includes('_dan')) {
        req = req.replace("_dan", O_DAN);
      }

      conversationLog.push({
        role: 'user',
        content: req,
      });
    });

	tasks.push(new AITask(message.author, model));
	var ctask = tasks.length-1;
	
    console.log("#" + ctask + " started with model " + tasks[ctask].model + " requested by " + tasks[ctask].user + "; direct prompt length: " + message.content.length);
    
    const result = await reqRes(conversationLog, tasks[ctask].model);
	
	var exit_code = "-1";
	
    switch (result) {
      case 429:
		if(!tasks[ctask].finished) {
			message.reply("Fehler 429. Bitte warte kurz und versuche es ernuet!");
			exit_code = "429";
			tasks[ctask].errors.push("429");
		}
        break;
      case 400:
		if(!tasks[ctask].finished) {
			message.channel.send("API Content Filter Error! @alex_s168");
			exit_code = "400";
			tasks[ctask].errors.push("400");
		}
        break;
      default:
		if(!tasks[ctask].finished) {
			message.reply(result.data.choices[0].message).catch((error) => {console.log(`DC ERR: ${error}`);});
			exit_code = "0";
		}
    }
	
	tasks[ctask].finished = true;
	console.log("#" + ctask + " stopped with exit code " + exit_code);
    
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
});

client.login(TOKEN);