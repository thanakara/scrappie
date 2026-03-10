const { Client, GatewayIntentBits, Events } = require("discord.js");
const cloudinary = require("cloudinary").v2;
const { getDB } = require("./database");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createClient() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
        ]
    });

    client.once(Events.ClientReady, (c) => {
        console.log(`Scrappie is online as ${c.user.tag}`);
    });

    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        // Ignore bot reactions
        if (user.bot) return;

        // Only listen for 📸 emoji
        if (reaction.emoji.name !== "📸") return;

        // Fetch full message
        const message = await reaction.message.fetch();

        // Check if message has an image
        const image = message.attachments.find(att =>
            att.contentType && att.contentType.startsWith("image/")
        );

        if (!image) {
            return;
        }

        try {
            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(image.url, {
                folder: `scrappie/${message.guild.id}`,
            });

            // Save to SQLite
            const db = getDB();
            db.prepare(`
        INSERT INTO memories (guild_id, channel_id, message_id, image_url, cloudinary_id, saved_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
                message.guild.id,
                message.channel.id,
                message.id,
                result.secure_url,
                result.public_id,
                user.id
            );

            // Confirm in Discord
            await message.reply(`📸 Memory saved by <@${user.id}>!`);
            console.log(`Image saved: ${result.secure_url}`);

        } catch (error) {
            console.error("Error saving image:", error);
            await message.reply("Oops! Something went wrong saving that memory.");
        }
    });

    return client;
}

module.exports = { createClient };