const Discord = require('discord.js')
const auth = require("./auth.json")
const utils = require("./botutils.js")
const commandUtils = require("./commandUtils.js")
const fs = require("fs")
var Datastore = require('nedb')
  , userEventDb = new Datastore({ filename: './db', autoload: true })

const client = new Discord.Client();
let groupBy = utils.groupBy

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    // ignore messages from this bot
    if (message.author.username === client.user.username) { return; }
    recordMessageActivity(message)

    roles = message.member.roles
    if (roles.find(r => r.name === "Titans (Discord-Admins)")){
        userEventDb.find({ 'guildId': message.guild.id })
                   .sort({ createdTimestamp: 1 }).exec((err, events) => {
            commandUtils.handleCommands(client, events, message)
        })
    }
});

function recordMessageActivity(message) {
    console.log(`Received message from ${message.author}`)
    let event = {
        "type": "message",
        "author": message.author.id,
        "guildId": message.guild.id,
        "channelId": message.channel.id,
        "messageId": message.id,
        "createdTimestamp": message.createdTimestamp
    }

    userEventDb.insert(event)
}

client.on("messageReactionAdd", function(messageReaction, user){
    let event = {
        "type": "messageReaction",
        "author": user.id,
        "guildId": messageReaction.message.guild.id,
        "channelId": messageReaction.message.channel.id,
        "createdTimestamp": new Date()/1
    }
    
    userEventDb.insert(event)
});

client.on("voiceStateUpdate", function(oldMember, newMember){
    if(oldMember.voiceChannel === undefined && newMember.voiceChannel !== undefined) {
        // User joining a voice channel
        let event = {
            "type": "joinVoiceChannel",
            "author": newMember.user.id,
            "guildId": newMember.guild.id,
            "channelId": newMember.voiceChannel.id,
            "createdTimestamp": new Date()/1
        }
        userEventDb.insert(event)
    }
    else if(newMember.voiceChannel === undefined){
        // User leaving a voice channel
        let event = {
            "type": "leaveVoiceChannel",
            "author": newMember.user.id,
            "guildId": newMember.guild.id,
            "channelId": oldMember.voiceChannel.id,
            "createdTimestamp": new Date()/1
        }
        userEventDb.insert(event)
    }
});

client.login(auth.token);