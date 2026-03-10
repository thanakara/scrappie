import { Client, GatewayIntentBits, Events, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { v2 as cloudinary } from "cloudinary";
import { getDB } from "./database.js";
import { timeAgo } from "./utils.js";

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
        console.log(`__online__: ${c.user.tag}`);
    });

    client.once(Events.ShardDisconnect, () => {
        console.log(`__offline__: disconnected`);
    });

    process.on("SIGINT", () => {
        console.log("__offline__: SIGINT");
        client.destroy();
        process.exit(0);
    });

    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return;
        if (reaction.emoji.name !== "📸") return;

        const message = await reaction.message.fetch();
        const image = message.attachments.find(att =>
            att.contentType && att.contentType.startsWith("image/")
        );

        if (!image) return;

        try {
            const result = await cloudinary.uploader.upload(image.url, {
                folder: `scrappie/${message.guild.id}`,
            });
            const db = getDB();

            db.prepare(`
                INSERT INTO memories (guild_id, channel_id, message_id, image_url, cloudinary_id, saved_by)
                VALUES (?, ?, ?, ?, ?, ?)`)
                .run(
                    message.guild.id,
                    message.channel.id,
                    message.id,
                    result.secure_url,
                    result.public_id,
                    user.id
                );

            await message.reply(`Saved by <@${user.id}>`);
            console.log(`Image saved: ${result.secure_url}`);

        } catch (error) {
            console.error("Error while saving:", error);
            await message.reply("Oops! Something went wrong saving that.");
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {

        // slash commands
        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === "scrapbook") {
                const db = getDB();
                const memories = db.prepare(`
                    SELECT * FROM memories 
                    WHERE guild_id = ? 
                    ORDER BY saved_at DESC 
                    LIMIT 10
                `).all(interaction.guild.id);

                if (memories.length === 0) {
                    await interaction.reply("No memories saved yet. React with 📸 on an image to save one.");
                    return;
                }

                const list = memories.map((m, i) =>
                    `**${i + 1}.** <@${m.saved_by}> • ${timeAgo(m.saved_at)}\n🔗 ${m.image_url}`
                ).join("\n\n");

                await interaction.reply(`**Your last memories:**\n\n${list}`);
            }

            if (interaction.commandName === "delete") {
                const db = getDB();
                const isAdmin = interaction.member.permissions.has("Administrator");

                const memories = isAdmin
                    ? db.prepare(`SELECT * FROM memories WHERE guild_id = ? ORDER BY saved_at DESC LIMIT 10`).all(interaction.guild.id)
                    : db.prepare(`SELECT * FROM memories WHERE guild_id = ? AND saved_by = ? ORDER BY saved_at DESC LIMIT 10`).all(interaction.guild.id, interaction.user.id);

                if (memories.length === 0) {
                    await interaction.reply({
                        content: "No memories found.",
                        ephemeral: true
                    });
                    return;
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId("delete_memory")
                    .setPlaceholder("Choose a memory to delete...")
                    .addOptions(
                        memories.map(m => {
                            const user = client.users.cache.get(m.saved_by);
                            const username = user ? user.username : "userNotCached";

                            return new StringSelectMenuOptionBuilder()
                                .setLabel(`Memory from ${timeAgo(m.saved_at)}`)
                                .setDescription(`Saved by @${username}`)
                                .setValue(String(m.id));
                        })
                    );

                const row = new ActionRowBuilder().addComponents(select);

                await interaction.reply({
                    content: "Which memory do you want to delete?",
                    components: [row],
                    ephemeral: true
                });
            }
        }

        // dropdown selection - show preview first
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId !== "delete_memory") return;

            const memoryId = interaction.values[0];
            const db = getDB();
            const memory = db.prepare(`SELECT * FROM memories WHERE id = ?`).get(memoryId);

            if (!memory) {
                await interaction.update({ content: "Memory not found.", components: [] });
                return;
            }

            const confirmButton = new ButtonBuilder()
                .setCustomId(`confirm_delete_${memoryId}`)
                .setLabel("Yes, delete it")
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId("cancel_delete")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await interaction.update({
                content: `Are you sure you want to delete this memory?\n\n🖼️ ${memory.image_url}`,
                components: [row]
            });
        }

        // button clicks - confirm or cancel
        if (interaction.isButton()) {
            if (interaction.customId === "cancel_delete") {
                await interaction.update({ content: "Cancelled!", components: [] });
                return;
            }

            if (interaction.customId.startsWith("confirm_delete_")) {
                const memoryId = interaction.customId.replace("confirm_delete_", "");
                const db = getDB();
                const memory = db.prepare(`SELECT * FROM memories WHERE id = ?`).get(memoryId);

                if (!memory) {
                    await interaction.update({ content: "Memory not found.", components: [] });
                    return;
                }

                try {
                    await cloudinary.uploader.destroy(memory.cloudinary_id);
                    db.prepare(`DELETE FROM memories WHERE id = ?`).run(memoryId);

                    await interaction.update({
                        content: `Memory #${memoryId} deleted.`,
                        components: []
                    });
                    console.log(`Memory #${memoryId} deleted.`);

                } catch (error) {
                    console.error("Error deleting memory:", error);
                    await interaction.update({
                        content: "Oops! Something went wrong deleting that memory.",
                        components: []
                    });
                }
            }
        }
    });

    return client;
}

export { createClient };