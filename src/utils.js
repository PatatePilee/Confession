const { EmbedBuilder } = require("discord.js");
const { COLORS, EMOJIS } = require("./config");
const winston = require("winston");

/**
 * Créer un embed avec style uniforme
 */
function createEmbed(title, description, color = COLORS.info) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

/**
 * Créer un embed de modération
 */
function createModerationEmbed(
  action,
  member,
  moderator,
  reason,
  duration = null
) {
  const actionEmojis = {
    ban: EMOJIS.ban,
    kick: EMOJIS.kick,
    mute: EMOJIS.mute,
    unmute: EMOJIS.unmute,
    warn: EMOJIS.warning,
    timeout: "⏰",
  };

  const actionColors = {
    ban: COLORS.ban,
    kick: COLORS.kick,
    mute: COLORS.mute,
    unmute: COLORS.success,
    warn: COLORS.warning,
    timeout: COLORS.mute,
  };

  const actionTitles = {
    ban: "Utilisateur banni",
    kick: "Utilisateur expulsé",
    mute: "Utilisateur muté",
    unmute: "Utilisateur démuté",
    warn: "Utilisateur averti",
    timeout: "Utilisateur timeout",
  };

  const embed = createEmbed(
    `${actionEmojis[action]} ${actionTitles[action]}`,
    `**Utilisateur:** ${member.toString()}\n**Modérateur:** ${moderator.toString()}\n**Raison:** ${reason}`,
    actionColors[action]
  );

  if (duration) {
    embed.addFields({ name: "⏱️ Durée", value: duration, inline: true });
  }

  return embed;
}

/**
 * Créer un embed de confession
 */
function createConfessionEmbed(confession) {
  const embed = createEmbed(
    `💭 Confession #${confession.id}`,
    confession.text,
    COLORS.confession
  );

  const timestamp = new Date(confession.timestamp);
  embed.setFooter({
    text: `Posté le ${timestamp.toLocaleDateString(
      "fr-FR"
    )} à ${timestamp.toLocaleTimeString("fr-FR")}`,
  });

  // Ajouter les réponses s'il y en a
  if (confession.responses && confession.responses.length > 0) {
    let responsesText = "";
    confession.responses.forEach((response, index) => {
      const responseTime = new Date(response.timestamp);
      responsesText += `**Réponse ${index + 1}:** ${
        response.response_text
      }\n*${responseTime.toLocaleDateString(
        "fr-FR"
      )} ${responseTime.toLocaleTimeString("fr-FR")}*\n\n`;
    });

    if (responsesText.length > 1000) {
      responsesText = responsesText.substring(0, 1000) + "...";
    }

    embed.addFields({
      name: `💬 Réponses (${confession.responses.length})`,
      value: responsesText || "Aucune réponse",
      inline: false,
    });
  }

  return embed;
}

/**
 * Parser une chaîne de temps en secondes
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;

  const regex = /(\d+)([smhd])/g;
  let totalSeconds = 0;
  let match;

  while ((match = regex.exec(timeStr)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        totalSeconds += value;
        break;
      case "m":
        totalSeconds += value * 60;
        break;
      case "h":
        totalSeconds += value * 3600;
        break;
      case "d":
        totalSeconds += value * 86400;
        break;
    }
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Formater une durée en secondes
 */
function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
}

/**
 * Vérifier si un utilisateur a les permissions requises
 */
function hasPermissions(member, permissions) {
  if (!member.permissions) return false;

  return permissions.every((permission) => member.permissions.has(permission));
}

/**
 * Obtenir un nom d'affichage sécurisé
 */
function getDisplayName(user) {
  return user.displayName || user.username || user.tag || "Utilisateur inconnu";
}

/**
 * Vérifier si une URL est valide
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Échapper les caractères spéciaux pour Discord
 */
function escapeMarkdown(text) {
  return text.replace(/[*_`~|]/g, "\\$&");
}

/**
 * Tronquer un texte à une longueur donnée
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Attendre un délai
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Générer un ID aléatoire
 */
function generateId(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Configuration du logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "discord-bot" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Ajouter le transport console en développement
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Fonction pour obtenir un logger avec un contexte spécifique
function getLogger(context) {
  return {
    info: (message) => logger.info(`[${context}] ${message}`),
    error: (message, error) => {
      if (error) {
        logger.error(`[${context}] ${message}`, {
          error: error.stack || error,
        });
      } else {
        logger.error(`[${context}] ${message}`);
      }
    },
    warn: (message) => logger.warn(`[${context}] ${message}`),
    debug: (message) => logger.debug(`[${context}] ${message}`),
  };
}

module.exports = {
  createEmbed,
  createModerationEmbed,
  createConfessionEmbed,
  parseTimeString,
  formatDuration,
  hasPermissions,
  getDisplayName,
  isValidUrl,
  escapeMarkdown,
  truncateText,
  wait,
  generateId,
  getLogger,
};
