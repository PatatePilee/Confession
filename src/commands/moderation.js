const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const {
  createEmbed,
  createModerationEmbed,
  parseTimeString,
  formatDuration,
  hasPermissions,
} = require("../utils");
const { COLORS, EMOJIS, PERMISSIONS } = require("../config");
const Database = require("../database");

const commands = new Map();
const db = new Database();

// Commande Ban
commands.set("ban", {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un utilisateur du serveur")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à bannir")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison du bannissement")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur");
    const reason =
      interaction.options.getString("raison") || "Aucune raison spécifiée";

    try {
      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (member) {
        // Vérifier les permissions
        if (
          member.roles.highest.position >=
            interaction.member.roles.highest.position &&
          interaction.user.id !== interaction.guild.ownerId
        ) {
          return interaction.reply({
            embeds: [
              createEmbed(
                "❌ Erreur",
                "Vous ne pouvez pas bannir cet utilisateur.",
                COLORS.error
              ),
            ],
            ephemeral: true,
          });
        }

        // Essayer d'envoyer un DM avant le ban
        try {
          const dmEmbed = createEmbed(
            `🔨 Banni de ${interaction.guild.name}`,
            `**Raison:** ${reason}\n**Modérateur:** ${interaction.user}`,
            COLORS.ban
          );
          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log("Impossible d'envoyer le DM de ban");
        }
      }

      // Bannir l'utilisateur
      await interaction.guild.bans.create(user.id, {
        reason: `Banni par ${interaction.user.tag} | ${reason}`,
      });

      const embed = createModerationEmbed(
        "ban",
        user,
        interaction.user,
        reason
      );
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors du ban:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors du bannissement.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

// Commande Kick
commands.set("kick", {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un utilisateur du serveur")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à expulser")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison de l'expulsion")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur");
    const reason =
      interaction.options.getString("raison") || "Aucune raison spécifiée";

    try {
      const member = await interaction.guild.members.fetch(user.id);

      if (
        member.roles.highest.position >=
          interaction.member.roles.highest.position &&
        interaction.user.id !== interaction.guild.ownerId
      ) {
        return interaction.reply({
          embeds: [
            createEmbed(
              "❌ Erreur",
              "Vous ne pouvez pas expulser cet utilisateur.",
              COLORS.error
            ),
          ],
          ephemeral: true,
        });
      }

      // Essayer d'envoyer un DM avant le kick
      try {
        const dmEmbed = createEmbed(
          `👢 Expulsé de ${interaction.guild.name}`,
          `**Raison:** ${reason}\n**Modérateur:** ${interaction.user}`,
          COLORS.kick
        );
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Impossible d'envoyer le DM de kick");
      }

      await member.kick(`Expulsé par ${interaction.user.tag} | ${reason}`);

      const embed = createModerationEmbed(
        "kick",
        user,
        interaction.user,
        reason
      );
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erreur lors du kick:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors de l'expulsion.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

// Commande Mute
commands.set("mute", {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Muter un utilisateur temporairement")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à muter")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duree")
        .setDescription("Durée du mute (ex: 1h30m, 2d)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison du mute")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur");
    const duration = interaction.options.getString("duree");
    const reason =
      interaction.options.getString("raison") || "Aucune raison spécifiée";

    try {
      const member = await interaction.guild.members.fetch(user.id);
      const durationSeconds = parseTimeString(duration);

      if (!durationSeconds) {
        return interaction.reply({
          embeds: [
            createEmbed(
              "❌ Erreur",
              "Format de durée invalide. Utilisez: 1h30m, 2d, 45s, etc.",
              COLORS.error
            ),
          ],
          ephemeral: true,
        });
      }

      if (
        member.roles.highest.position >=
          interaction.member.roles.highest.position &&
        interaction.user.id !== interaction.guild.ownerId
      ) {
        return interaction.reply({
          embeds: [
            createEmbed(
              "❌ Erreur",
              "Vous ne pouvez pas muter cet utilisateur.",
              COLORS.error
            ),
          ],
          ephemeral: true,
        });
      }

      // Utiliser le timeout Discord natif
      const timeoutDuration = Math.min(
        durationSeconds * 1000,
        28 * 24 * 60 * 60 * 1000
      ); // Max 28 jours
      await member.timeout(
        timeoutDuration,
        `Muté par ${interaction.user.tag} | ${reason}`
      );

      // Sauvegarder en base de données
      const endTime = new Date(Date.now() + timeoutDuration);
      await interaction.client.db.addTempMute(
        interaction.guild.id,
        user.id,
        "timeout",
        endTime
      );

      const formattedDuration = formatDuration(durationSeconds);
      const embed = createModerationEmbed(
        "mute",
        user,
        interaction.user,
        reason,
        formattedDuration
      );

      await interaction.reply({ embeds: [embed] });

      // Essayer d'envoyer un DM
      try {
        const dmEmbed = createEmbed(
          `🔇 Muté sur ${interaction.guild.name}`,
          `**Raison:** ${reason}\n**Durée:** ${formattedDuration}\n**Modérateur:** ${interaction.user}`,
          COLORS.mute
        );
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Impossible d'envoyer le DM de mute");
      }
    } catch (error) {
      console.error("Erreur lors du mute:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors du mute.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

// Commande Unmute
commands.set("unmute", {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Démuter un utilisateur")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à démuter")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison du démute")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur");
    const reason =
      interaction.options.getString("raison") || "Aucune raison spécifiée";

    try {
      const member = await interaction.guild.members.fetch(user.id);

      if (!member.isCommunicationDisabled()) {
        return interaction.reply({
          embeds: [
            createEmbed(
              "❌ Erreur",
              "Cet utilisateur n'est pas muté.",
              COLORS.error
            ),
          ],
          ephemeral: true,
        });
      }

      await member.timeout(
        null,
        `Démuté par ${interaction.user.tag} | ${reason}`
      );
      await interaction.client.db.removeTempMute(interaction.guild.id, user.id);

      const embed = createModerationEmbed(
        "unmute",
        user,
        interaction.user,
        reason
      );
      await interaction.reply({ embeds: [embed] });

      // Essayer d'envoyer un DM
      try {
        const dmEmbed = createEmbed(
          `🔊 Démuté sur ${interaction.guild.name}`,
          `**Raison:** ${reason}\n**Modérateur:** ${interaction.user}`,
          COLORS.success
        );
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Impossible d'envoyer le DM de démute");
      }
    } catch (error) {
      console.error("Erreur lors du unmute:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors du démute.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

// Commande Warn
commands.set("warn", {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un utilisateur")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("Utilisateur à avertir")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison de l'avertissement")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur");
    const reason =
      interaction.options.getString("raison") || "Aucune raison spécifiée";

    try {
      await interaction.client.db.addWarning(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        reason
      );
      const warnings = await interaction.client.db.getWarnings(
        interaction.guild.id,
        user.id
      );

      const embed = createModerationEmbed(
        "warn",
        user,
        interaction.user,
        reason
      );
      embed.addFields({
        name: "Total d'avertissements",
        value: warnings.length.toString(),
        inline: true,
      });

      await interaction.reply({ embeds: [embed] });

      // Essayer d'envoyer un DM
      try {
        const dmEmbed = createEmbed(
          `⚠️ Avertissement sur ${interaction.guild.name}`,
          `**Raison:** ${reason}\n**Modérateur:** ${interaction.user}\n**Total d\'avertissements:** ${warnings.length}`,
          COLORS.warning
        );
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log("Impossible d'envoyer le DM d'avertissement");
      }
    } catch (error) {
      console.error("Erreur lors du warn:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors de l'avertissement.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

// Commande Clear
commands.set("clear", {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer des messages en masse")
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("Raison de la suppression")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger("nombre");
    const reason =
      interaction.options.getString("raison") || "Nettoyage de messages";

    try {
      const messages = await interaction.channel.bulkDelete(amount, true);

      const embed = createEmbed(
        "🧹 Messages supprimés",
        `**Messages supprimés:** ${messages.size}\n**Salon:** ${interaction.channel}\n**Modérateur:** ${interaction.user}\n**Raison:** ${reason}`,
        COLORS.success
      );

      const reply = await interaction.reply({
        embeds: [embed],
        fetchReply: true,
      });

      // Supprimer le message de confirmation après 5 secondes
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (error) {
          console.log("Impossible de supprimer le message de confirmation");
        }
      }, 5000);
    } catch (error) {
      console.error("Erreur lors du clear:", error);
      await interaction.reply({
        embeds: [
          createEmbed(
            "❌ Erreur",
            "Une erreur s'est produite lors de la suppression des messages.",
            COLORS.error
          ),
        ],
        ephemeral: true,
      });
    }
  },
});

function loadCommands(client) {
  // Charger les commandes slash
  for (const [name, command] of commands) {
    client.commands.set(name, command);
  }

  console.log(`✅ ${commands.size} commandes de modération chargées`);
}

module.exports = { loadCommands };
