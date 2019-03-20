const utils = require("./botutils.js")
let groupBy = utils.groupBy

/////////////////
// Public exports
/////////////////
function handleCommands(client, eventLog, message) {
    userReportRegex = /!report.*<@([^>]+)>/
    topRegex = /.*/
    guild = message.guild

    userReportMatch = message.content.match(userReportRegex)
    if (userReportMatch) {
        userId = userReportMatch[1]
        doUserReportCommand(client, guild, eventLog, message, userId)
    }

    topMatch = message.content.match(topRegex)
    if (topMatch) {
        guild.fetchMembers().then( () =>
            doTopUsersReportCommand(client, guild, eventLog, message)
        )
    }
}

/////////////////
// Private 
/////////////////
function doUserReportCommand(client, guild, eventLog, message, userId) {
    client.fetchUser(userId).then(user => {
        let userReport = getUserReport(user, eventLog)
        let reportText = makeUserReportString(user, userReport)

        message.reply(reportText)
            .then(sent => console.log(`Sent a reply to ${message.author.username}`))
            .catch(console.error)
    })
}

function doTopUsersReportCommand(client, guild, eventLog, message) {
    let topUsersReport = getTopUsersReport(eventLog)
    let reportText = makeTopUsersReportString(topUsersReport, guild)

    message.reply(reportText)
        .then(sent => console.log(`Sent a reply to ${message.author.username}`))
        .catch(console.error)
}

function getUserReport(userId, eventLog) {
    return {
        userId: userId,
        messageCount: getMessageCount(userId, eventLog),
        reactionCount: getReactionCount(userId, eventLog),
        timeSpentInVoiceChat: getTimeSpentInVoiceChat(userId, eventLog) / 1000.0 / 60.0
    }
}

function makeUserReportString(user, userReport) {
    return `Report for ${user.username}(${user.tag})` +
        `\nMessages sent: ${userReport.messageCount}` +
        `\nReactions: ${userReport.reactionCount}` +
        `\nTime spent in voice chat: ${userReport.timeSpentInVoiceChat.toFixed(2)} minutes`
}

function makeTopUsersReportString(topUsersReport, guild) {
    let topChattersString = topUsersReport.topChatters.map( report => {
        let user = guild.members.get(report.userId).user
        return `${report.messageCount} messages - ${user.username} (${user.tag})`
    }
    ).join("\n")

    let topTalkersString = topUsersReport.topTalkers.map( report => {
        let user = guild.members.get(report.userId).user
        return `${report.timeSpentInVoiceChat.toFixed(2)} min - ${user.username} (${user.tag})`
    }).join("\n")

    return `Member Activity Report:` +
        `\nMost messages sent` +
        `\n${topChattersString}` +
        `\n\nTime spent in voice chat` +
        `\n${topTalkersString}`
}

function getTopUsersReport(eventLog) {
    num_top_users = 5
    activityPerUser = groupBy(eventLog, event => { return event.author })

    userReports = Object.keys(activityPerUser).map(userId => {
        return getUserReport(userId, activityPerUser[userId])
    })

    let topChatters = userReports.sort(comparitor(report => { return report.messageCount }))
                      .reverse()
                      .slice(0, num_top_users)

    let topTalkers = userReports.sort(comparitor(report => { return report.timeSpentInVoiceChat }))
                      .reverse()
                      .slice(0, num_top_users)

    return {
        topChatters: topChatters,
        topTalkers: topTalkers
    }
}

function comparitor(fn) {
    return function (a, b) {
        return fn(a) - fn(b)
    }
}

function getMessageCount(userId, eventLog) {
    messages = eventLog.filter(event => {
        return event.type === "message" && event.author === userId
    })
    return messages.length
}

function getReactionCount(userId, eventLog) {
    reactions = eventLog.filter(event => {
        return event.type === "messageReaction" && event.author === userId
    })
    return reactions.length
}

function getTimeSpentInVoiceChat(userId, eventLog) {
    voiceEvents = eventLog.filter(event => {
        return (event.type === "joinVoiceChannel" || event.type === "leaveVoiceChannel") &&
            event.author === userId
    })

    let totalTime = 0

    if (voiceEvents.length > 0) {
        // Initialize lastEvent to a dummy 
        let type = voiceEvents[0] === "joinVoiceChannel" ? "joinVoiceChannel" : "leaveVoiceChannel"

        let lastEvent = {
            "type": type,
            "author": userId,
            "channelId": voiceEvents[0].channelId,
            "createdTimestamp": voiceEvents[0].createdTimestamp
        }

        voiceEvents.forEach(event => {
            // Only add up time when the user goes from joined to leaving
            if (lastEvent.type === "joinVoiceChannel" && event.type === "leaveVoiceChannel") {
                let timeDiff = event.createdTimestamp - lastEvent.createdTimestamp
                totalTime += timeDiff
            }

            lastEvent = event
        })
    }

    return totalTime
}

module.exports.handleCommands = handleCommands