require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { getLogger } = require("./src/utils");

const logger = getLogger("DeployGuildCommands");

// Vérification des variables d'environnement
if (!process.env.DISCORD_TOKEN) {
  logger.error("Token Discord manquant dans le fichier .env");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  logger.error("CLIENT_ID manquant dans le fichier .env");
  process.exit(1);
}

// ID de votre serveur - remplacez par l'ID de votre serveur Discord
const GUILD_ID = process.argv[2];

if (!GUILD_ID) {
  logger.error(
    "Veuillez fournir l'ID du serveur: node deploy-guild-commands.js [GUILD_ID]"
  );
  process.exit(1);
}

const commands = [];

// Charger les commandes de musique
try {
  const musicCommands = require("./src/commands/music");
  if (Array.isArray(musicCommands)) {
    musicCommands.forEach((command) => {
      if (command && command.data) {
        commands.push(command.data.toJSON());
      }
    });
  }
} catch (error) {
  logger.error("Erreur lors du chargement des commandes de musique:", error);
}

// Charger toutes les commandes slash de modération
try {
  const slashModerationCommands = require("./src/commands/slash-moderation");
  if (Array.isArray(slashModerationCommands)) {
    slashModerationCommands.forEach((command) => {
      if (command && command.data) {
        commands.push(command.data.toJSON());
      }
    });
  }
} catch (error) {
  logger.error(
    "Erreur lors du chargement des commandes slash de modération:",
    error
  );
}

if (commands.length === 0) {
  logger.error("Aucune commande trouvée à déployer");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info(
      `Début du déploiement de ${commands.length} commandes slash sur le serveur ${GUILD_ID}...`
    );

    // Déployer les commandes sur le serveur spécifique (instantané)
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    logger.info(
      `✅ ${data.length} commandes slash déployées avec succès sur le serveur!`
    );
    logger.info("Commandes déployées:");
    data.forEach((cmd) => {
      logger.info(`- /${cmd.name}: ${cmd.description}`);
    });

    logger.info(
      "🚀 Les commandes sont maintenant disponibles IMMÉDIATEMENT sur votre serveur!"
    );
  } catch (error) {
    logger.error("Erreur lors du déploiement des commandes:", error);
    if (error.code === 50035) {
      logger.error("Vérifiez que votre CLIENT_ID et GUILD_ID sont corrects");
    }
  }
})();
