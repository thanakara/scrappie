import "dotenv/config";
import { connectDB } from "./database.js";
import { createClient } from "./bot.js";

async function main() {
    console.log("__start__: scrappie");
    connectDB();

    // start bot
    const client = createClient();
    await client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);