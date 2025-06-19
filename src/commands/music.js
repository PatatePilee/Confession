const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const musicPlayer = require("../music/player");
const { getLogger } = require("../utils");

const logger = getLogger("MusicCommands");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("play")
      .setDescription("Jouer une musique depuis YouTube")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("URL ou recherche YouTube")
          .setRequired(true)
      ),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        const query = interaction.options.getString("query");
        const song = await musicPlayer.play(interaction, query);

        const embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("🎵 Lecture en cours")
          .setDescription(`[${song.title}](${song.url})`)
          .addFields({
            name: "Durée",
            value: `${Math.floor(song.duration / 60)}:${(song.duration % 60)
              .toString()
              .padStart(2, "0")}`,
            inline: true,
          });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error("Erreur play:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply(
              "❌ Une erreur est survenue lors de la lecture."
            );
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue lors de la lecture.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("stop")
      .setDescription("Arrêter la musique"),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        musicPlayer.stop(interaction.guild.id);
        await interaction.editReply("⏹️ Musique arrêtée");
      } catch (error) {
        logger.error("Erreur stop:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply("❌ Une erreur est survenue.");
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("pause")
      .setDescription("Mettre en pause la musique"),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        musicPlayer.pause(interaction.guild.id);
        await interaction.editReply("⏸️ Musique en pause");
      } catch (error) {
        logger.error("Erreur pause:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply("❌ Une erreur est survenue.");
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("resume")
      .setDescription("Reprendre la musique"),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        musicPlayer.resume(interaction.guild.id);
        await interaction.editReply("▶️ Musique reprise");
      } catch (error) {
        logger.error("Erreur resume:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply("❌ Une erreur est survenue.");
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("volume")
      .setDescription("Ajuster le volume (0-100)")
      .addIntegerOption((option) =>
        option
          .setName("level")
          .setDescription("Niveau du volume (0-100)")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)
      ),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        const volume = interaction.options.getInteger("level");
        musicPlayer.setVolume(interaction.guild.id, volume);
        await interaction.editReply(`🔊 Volume réglé à ${volume}%`);
      } catch (error) {
        logger.error("Erreur volume:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply("❌ Une erreur est survenue.");
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName("disconnect")
      .setDescription("Déconnecter le bot du salon vocal"),

    async execute(interaction) {
      try {
        await interaction.deferReply();
        musicPlayer.disconnect(interaction.guild.id);
        await interaction.editReply("👋 Déconnecté du salon vocal");
      } catch (error) {
        logger.error("Erreur disconnect:", error);
        try {
          if (interaction.deferred) {
            await interaction.editReply("❌ Une erreur est survenue.");
          } else {
            await interaction.reply({
              content: "❌ Une erreur est survenue.",
              flags: 64,
            });
          }
        } catch (replyError) {
          logger.error("Erreur lors de la réponse d'erreur:", replyError);
        }
      }
    },
  },
];
