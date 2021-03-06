import io from 'socket.io-client';
import config from 'config';
import Guild from './guild';

var socket = io.connect(`${config.get('server')}:8080`);

export default (client) => {

    socket.on('timer', async(data) => {
        let guilds = await Guild.getGuilds();
        if (!guilds || !Array.isArray(guilds)) return;
        guilds.forEach(async(guild) => {
            guild = guild.dataValues;
            let channel = client.channels.get(guild.timer_id);
            if (!channel) return;

            let text = '```js' +
            '\n[Server Time]\n' + data.time +
            '\n\n[Daily Reset]\n' + data.daily +
            '\n\n[Weekly Reset]\n' + data.weekly +
            '\n\n[Guild and Dojo Reset]\n' + data.guild +
            '\n\n[Kritias Invasion]\n' + data.invasion;
            if (data.current2x) text += '\n\n[Current 2x EXP & Drop Event Ends In]\n' + data.current2x;
            if (data.next2x) text += '\n\n[Next 2x EXP & Drop Event Starts In]\n' + data.next2x;
            text += '\n```';

            if (!guild.timer_message) return sendMessage();
            await channel.fetchMessage(guild.timer_message).then((message) => {
                message.edit(text).catch(() => {
                    sendMessage();
                });
            }).catch(async() => {
                sendMessage();
            });

            async function sendMessage() {
                await bulkDelete(channel);
                channel.send(text).then(((message) => {
                    guild.timer_message = message.id;
                    Guild.updateGuildWithId(guild.id, guild);
                }));
            }
        });
    });

    socket.on('news', async(posts) => {
        let guilds = await Guild.getGuilds();
        if (!guilds || !Array.isArray(guilds)) return;
        guilds.forEach(async(guild) => {
            let channel = client.channels.get(guild.sub_id);
            if (!channel) return;
            posts.forEach((post) => {
                channel.send('', { embed: { color: 0x33A2FF, title: post.title, description: post.description, thumbnail: { url: post.image }, url: post.link } });
            });
        });
    });

    socket.on('maintenance', async(isOnline) => {
        let guilds = await Guild.getGuilds();
        if (!guilds || !Array.isArray(guilds)) return;
        guilds.forEach(async(guild) => {
            let channel = client.channels.get(guild.notice_id);
            if (!channel) return;
            let msg = (isOnline) ? 'Maintenance is now complete. See y’all in game!' : 'Maplestory is undergoing maintenance';
            let notice_msg = (guild.notice_msg) ? guild.notice_msg : '';
            channel.send(`${notice_msg}\n${msg}`);
        });
    });

};

async function bulkDelete(channel) {
    let messages = await channel.fetchMessages({ limit: 100 });
    let filteredMessages = messages.filter((message) => {
        return message.author.id === config.get('discord').clientId;
    });
    await channel.bulkDelete(filteredMessages).catch(async() => {
        // console.error('failed to delete messages');
        if (filteredMessages.first()) await filteredMessages.first().delete().catch(() => {
            console.error('failed to delete message');
        });
    });
}