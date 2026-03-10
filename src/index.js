require("dotenv").config();
const { connectDB } = require("./database");
const { createClient } = require("./bot");

async function main() {
    console.log("Starting scrappie");
    connectDB();
    // Start Discord Bot
    const client = createClient();
    await client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);