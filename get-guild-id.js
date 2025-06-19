require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLogger } = require("./src/utils");

const logger = getLogger("GetGuildID");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  logger.info(`Bot connecté en tant que ${client.user.tag}`);
  logger.info("Serveurs Discord où le bot est présent:");

  client.guilds.cache.forEach((guild) => {
    logger.info(`- ${guild.name} (ID: ${guild.id})`);
  });

  if (client.guilds.cache.size === 1) {
    const guild = client.guilds.cache.first();
    logger.info(`\n🎯 Commande pour déployer sur votre serveur:`);
    logger.info(`node deploy-guild-commands.js ${guild.id}`);
  }

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
