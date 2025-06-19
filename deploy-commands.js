require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { getLogger } = require("./src/utils");

const logger = getLogger("DeployCommands");

// Vérification des variables d'environnement
if (!process.env.DISCORD_TOKEN) {
  logger.error("Token Discord manquant dans le fichier .env");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  logger.error("CLIENT_ID manquant dans le fichier .env");
  process.exit(1);
}

// Vérification du format du CLIENT_ID
if (!/^\d{17,19}$/.test(process.env.CLIENT_ID)) {
  logger.error("CLIENT_ID invalide. Il doit être un nombre de 17-19 chiffres.");
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

// Charger toutes les commandes slash de modération (incluant aide, confession, etc.)
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

// Charger les anciennes commandes de modération (si elles existent encore)
try {
  const moderationCommands = require("./src/commands/moderation");
  if (Array.isArray(moderationCommands)) {
    moderationCommands.forEach((command) => {
      if (command && command.data) {
        commands.push(command.data.toJSON());
      }
    });
  } else if (
    typeof moderationCommands === "object" &&
    moderationCommands.data
  ) {
    commands.push(moderationCommands.data.toJSON());
  }
} catch (error) {
  logger.error(
    "Erreur lors du chargement des anciennes commandes de modération:",
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
      `Début du déploiement de ${commands.length} commandes slash...`
    );

    // Déployer les commandes globalement
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    logger.info(`✅ ${data.length} commandes slash déployées avec succès!`);
    logger.info("Commandes déployées:");
    data.forEach((cmd) => {
      logger.info(`- /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    logger.error("Erreur lors du déploiement des commandes:", error);
    if (error.code === 50035) {
      logger.error(
        "Vérifiez que votre CLIENT_ID est correct dans le fichier .env"
      );
    }
  }
})();
