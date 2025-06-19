require("dotenv").config();

// Keep-alive pour Replit
if (process.env.REPLIT) {
  require("./keep-alive");
}

const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getLogger } = require("./src/utils");
const { COLORS } = require("./src/config");
const Database = require("./src/database");
const slashModerationCommands = require("./src/commands/slash-moderation");

const logger = getLogger("Bot");
const db = new Database();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Charger seulement les commandes de modération (sans musique)
const commands = [...slashModerationCommands];

commands.forEach((command) => {
  if (command && command.data) {
    client.commands.set(command.data.name, command);
  }
});

client.once("ready", () => {
  logger.info(`Bot connecté en tant que ${client.user.tag}`);
  logger.info(`Bot présent sur ${client.guilds.cache.size} serveurs`);
  logger.info(
    `${client.commands.size} commandes slash chargées (sans musique)`
  );
});

// Gestionnaire des interactions
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    // Commandes slash
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Erreur lors de l'exécution de la commande slash:", error);

      // Vérifier si l'interaction a déjà été répondue
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content:
              "❌ Une erreur est survenue lors de l'exécution de la commande.",
            flags: 64, // InteractionResponseFlags.Ephemeral
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content:
              "❌ Une erreur est survenue lors de l'exécution de la commande.",
          });
        }
      } catch (replyError) {
        logger.error("Erreur lors de la réponse d'erreur:", replyError);
      }
    }
  } else if (interaction.isButton()) {
    // Boutons des confessions et timeouts
    if (interaction.customId.startsWith("respond_confession_")) {
      const confessionId = parseInt(interaction.customId.split("_")[2]);

      const modal = new ModalBuilder()
        .setCustomId(`confession_response_${confessionId}`)
        .setTitle("Réponse Anonyme");

      const responseInput = new TextInputBuilder()
        .setCustomId("response_text")
        .setLabel("Votre réponse anonyme")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Écrivez votre réponse ici...")
        .setRequired(true)
        .setMaxLength(1000);

      const firstActionRow = new ActionRowBuilder().addComponents(
        responseInput
      );
      modal.addComponents(firstActionRow);

      try {
        await interaction.showModal(modal);
      } catch (error) {
        logger.error("Erreur modal confession:", error);
      }
    }
    // Boutons de timeout
    else if (interaction.customId.startsWith("timeout_")) {
      const parts = interaction.customId.split("_");
      const duration = parts[1];
      const userId = parts[2];

      if (duration === "cancel") {
        const embed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle("❌ Timeout annulé")
          .setDescription("L'action de timeout a été annulée.");

        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      try {
        const member = await interaction.guild.members.fetch(userId);

        let durationMs;
        let durationText;

        switch (duration) {
          case "1min":
            durationMs = 1 * 60 * 1000;
            durationText = "1 minute";
            break;
          case "30min":
            durationMs = 30 * 60 * 1000;
            durationText = "30 minutes";
            break;
          case "600min":
            durationMs = 600 * 60 * 1000;
            durationText = "600 minutes (10 heures)";
            break;
        }

        await member.timeout(durationMs, `Timeout par ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("⏰ Timeout appliqué")
          .addFields(
            { name: "Utilisateur", value: `${member}`, inline: true },
            { name: "Durée", value: durationText, inline: true },
            { name: "Modérateur", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        logger.info(
          `Timeout appliqué: ${member.user.tag} (${userId}) par ${interaction.user.tag} pour ${durationText}`
        );
      } catch (error) {
        logger.error("Erreur timeout bouton:", error);
        const embed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle("❌ Erreur")
          .setDescription("Une erreur est survenue lors du timeout.");

        await interaction.update({ embeds: [embed], components: [] });
      }
    }
  } else if (interaction.isModalSubmit()) {
    // Réponses aux confessions
    if (interaction.customId.startsWith("confession_response_")) {
      const confessionId = parseInt(interaction.customId.split("_")[2]);
      const responseText =
        interaction.fields.getTextInputValue("response_text");

      try {
        await db.addConfessionResponse(
          interaction.guild.id,
          confessionId,
          responseText
        );

        const confession = await db.getConfession(
          interaction.guild.id,
          confessionId
        );

        if (confession) {
          const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`💭 Confession #${confessionId}`)
            .setDescription(confession.text);

          if (confession.responses && confession.responses.length > 0) {
            const responsesText = confession.responses
              .map((resp, index) => `**${index + 1}.** ${resp}`)
              .join("\n\n");
            embed.addFields({ name: "💬 Réponses:", value: responsesText });
          }

          embed.setFooter({
            text: "Confession anonyme • Répondez via le bouton",
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`respond_confession_${confessionId}`)
              .setLabel("Répondre Anonymement")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("💬")
          );

          try {
            const confessionChannelId = await db.getConfessionChannel(
              interaction.guild.id
            );
            const confessionChannel =
              interaction.guild.channels.cache.get(confessionChannelId);

            if (confessionChannel) {
              const messages = await confessionChannel.messages.fetch({
                limit: 100,
              });
              const confessionMessage = messages.find((msg) =>
                msg.embeds.some(
                  (embed) => embed.title === `💭 Confession #${confessionId}`
                )
              );

              if (confessionMessage) {
                await confessionMessage.edit({
                  embeds: [embed],
                  components: [row],
                });
              }
            }
          } catch (error) {
            logger.error("Erreur mise à jour confession:", error);
          }
        }

        await interaction.reply({
          content: "✅ Votre réponse anonyme a été ajoutée avec succès!",
          flags: 64,
        });
      } catch (error) {
        logger.error("Erreur réponse confession:", error);
        await interaction.reply({
          content:
            "❌ Une erreur est survenue lors de l'ajout de votre réponse.",
          flags: 64,
        });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
