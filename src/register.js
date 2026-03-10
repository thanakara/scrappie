import "dotenv/config";
import { ContextMenuCommandAssertions, REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
    new SlashCommandBuilder()
        .setName("scrapbook")
        .setDescription("View the last 10 saved memories in this server"),

    new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Delete a memory from the scrapbook")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// */⸻global-level⸻ */
// try {
//     console.log("__register__: clear-global-commands");
//     await rest.put(
//         Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
//         { body: [] }
//     );
//     console.log("__register__: put-global-commands");
//     await rest.put(
//         Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
//         { body: commands }
//     );
//     console.log("__register__: ok");
// } catch (error) {
//     console.error("__register__: error- ", error);
// }

// */⸻guild-level⸻ */
try {
    console.log("__register__: clear-guild-commands");
    await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: [] }
    );
    console.log("__register__: put-guild-commands");
    await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
    );
    console.log("__register__: ok");
} catch (error) {
    console.error("__register__: error- ", error);
}