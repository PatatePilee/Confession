const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { COLORS } = require("../config");
const Database = require("../database");

const db = new Database();

// Fonction utilitaire pour parser la durée
function parseDuration(duration) {
  const regex = /(\d+)([smhd])/g;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const amount = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        totalMs += amount * 1000;
        break;
      case "m":
        totalMs += amount * 60 * 1000;
        break;
      case "h":
        totalMs += amount * 60 * 60 * 1000;
        break;
      case "d":
        totalMs += amount * 24 * 60 * 60 * 1000;
        break;
    }
  }

  return totalMs > 0 ? totalMs : null;
}

module.exports = [
  // AIDE COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("aide")
      .setDescription("Afficher l'aide du bot"),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle("🤖 Bot de Modération - Commandes")
        .setDescription("Voici toutes les commandes disponibles :")
        .addFields(
          {
            name: "🛡️ MODÉRATION",
            value:
              "• `/ban @user [raison]` - Bannir\n" +
              "• `/unban <id> [raison]` - Débannir\n" +
              "• `/kick @user [raison]` - Expulser\n" +
              "• `/mute @user <durée> [raison]` - Muter\n" +
              "• `/unmute @user [raison]` - Démuter\n" +
              "• `/timeout @user [raison]` - Timeout (avec boutons)\n" +
              "• `/untimeout @user [raison]` - Retirer timeout\n" +
              "• `/warn @user [raison]` - Avertir\n" +
              "• `/warnings @user` - Voir avertissements\n" +
              "• `/clearwarnings @user` - Effacer avertissements",
            inline: false,
          },
          {
            name: "🧹 NETTOYAGE",
            value:
              "• `/clear <nombre>` - Supprimer des messages\n" +
              "• `/snipe` - Voir le dernier message supprimé",
            inline: false,
          },
          {
            name: "🔊 VOCAL",
            value:
              "• `/join @user` - Rejoindre le salon vocal d'un utilisateur\n" +
              "• `/move <id_user> <id_salon>` - Déplacer un utilisateur\n" +
              "• `/movemention @user #salon` - Déplacer avec mentions",
            inline: false,
          },
          {
            name: "💭 CONFESSIONS",
            value:
              "• `/setconfession #salon` - Configurer salon\n" +
              "• `/confession <texte>` - Envoyer confession\n" +
              "• `/confessions [nombre]` - Voir confessions\n" +
              '• **Bouton "Répondre Anonymement"** - Répondre via modal',
            inline: false,
          },
          {
            name: "🎵 MUSIQUE",
            value:
              "• `/play <url/recherche>` - Jouer une musique\n" +
              "• `/stop` - Arrêter la musique\n" +
              "• `/pause` - Mettre en pause\n" +
              "• `/resume` - Reprendre\n" +
              "• `/volume <0-100>` - Ajuster le volume\n" +
              "• `/disconnect` - Déconnecter le bot",
            inline: false,
          },
          {
            name: "🔍 UTILITAIRES",
            value:
              "• `/find @user` - Informations utilisateur\n" +
              "• `/uptime` - Statistiques du bot",
            inline: false,
          },
          {
            name: "⏰ DURÉES",
            value:
              "• `5s` = 5 secondes\n• `10m` = 10 minutes\n• `2h` = 2 heures\n• `1d` = 1 jour",
            inline: true,
          },
          {
            name: "🎨 COULEURS",
            value:
              "🔴 Erreur • 🟡 Avertissement • 🟢 Succès • 🔵 Information • 🟣 Confession",
            inline: true,
          }
        )
        .setFooter({ text: "Bot de modération Discord" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  },

  // CLEAR COMMAND
  {
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
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de gérer les messages.",
          ephemeral: true,
        });
      }

      const amount = interaction.options.getInteger("nombre");

      try {
        const messages = await interaction.channel.bulkDelete(amount, true);

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("🧹 Messages supprimés")
          .setDescription(
            `**${messages.size} messages** ont été supprimés avec succès.`
          )
          .setFooter({ text: `Demandé par ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error("Erreur lors du clear:", error);
        await interaction.reply({
          content:
            "❌ Une erreur est survenue lors de la suppression des messages.",
          ephemeral: true,
        });
      }
    },
  },

  // BAN COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Bannir un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à bannir")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du bannissement")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de bannir des membres.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      try {
        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (
          member &&
          member.roles.highest.position >=
            interaction.member.roles.highest.position &&
          interaction.user.id !== interaction.guild.ownerId
        ) {
          return interaction.reply({
            content: "❌ Vous ne pouvez pas bannir cet utilisateur.",
            ephemeral: true,
          });
        }

        await interaction.guild.bans.create(user.id, {
          reason: `Banni par ${interaction.user.tag} | ${reason}`,
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle("🔨 Utilisateur banni")
          .addFields(
            {
              name: "Utilisateur",
              value: `${user.tag} (${user.id})`,
              inline: true,
            },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du ban:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du bannissement.",
          ephemeral: true,
        });
      }
    },
  },

  // KICK COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Expulser un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à expulser")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison de l'expulsion")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.KickMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission d'expulser des membres.",
          ephemeral: true,
        });
      }

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
            content: "❌ Vous ne pouvez pas expulser cet utilisateur.",
            ephemeral: true,
          });
        }

        await member.kick(`Expulsé par ${interaction.user.tag} | ${reason}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("👢 Utilisateur expulsé")
          .addFields(
            {
              name: "Utilisateur",
              value: `${user.tag} (${user.id})`,
              inline: true,
            },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du kick:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors de l'expulsion.",
          ephemeral: true,
        });
      }
    },
  },

  // UNBAN COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Débannir un utilisateur")
      .addStringOption((option) =>
        option
          .setName("userid")
          .setDescription("L'ID de l'utilisateur à débannir")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du débannissement")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de débannir des membres.",
          ephemeral: true,
        });
      }

      const userId = interaction.options.getString("userid");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      if (!/^\d{17,19}$/.test(userId)) {
        return interaction.reply({
          content: "❌ Veuillez fournir un ID utilisateur valide.",
          ephemeral: true,
        });
      }

      try {
        await interaction.guild.bans.remove(
          userId,
          `Débanni par ${interaction.user.tag} | ${reason}`
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("✅ Utilisateur débanni")
          .addFields(
            {
              name: "Utilisateur",
              value: `<@${userId}> (${userId})`,
              inline: true,
            },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du unban:", error);
        await interaction.reply({
          content:
            "❌ Utilisateur non trouvé dans la liste des bannis ou erreur lors du débannissement.",
          ephemeral: true,
        });
      }
    },
  },

  // MUTE COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Muter un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à muter")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("duree")
          .setDescription("Durée du mute (ex: 10m, 1h, 1d)")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du mute")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de muter des membres.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const duration = interaction.options.getString("duree");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      const durationMs = parseDuration(duration);
      if (!durationMs) {
        return interaction.reply({
          content: "❌ Format de durée invalide. Utilisez: 5s, 10m, 2h, 1d",
          ephemeral: true,
        });
      }

      if (durationMs > 28 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
          content: "❌ La durée maximale est de 28 jours.",
          ephemeral: true,
        });
      }

      try {
        const member = await interaction.guild.members.fetch(user.id);

        if (
          member.roles.highest.position >=
            interaction.member.roles.highest.position &&
          interaction.user.id !== interaction.guild.ownerId
        ) {
          return interaction.reply({
            content: "❌ Vous ne pouvez pas muter cet utilisateur.",
            ephemeral: true,
          });
        }

        await member.timeout(
          durationMs,
          `Muté par ${interaction.user.tag} | ${reason}`
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("🔇 Utilisateur muté")
          .addFields(
            { name: "Utilisateur", value: `${user.tag}`, inline: true },
            { name: "Durée", value: duration, inline: true },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du mute:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du mute.",
          ephemeral: true,
        });
      }
    },
  },

  // UNMUTE COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("Démuter un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à démuter")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du démute")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de démuter des membres.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      try {
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.isCommunicationDisabled()) {
          return interaction.reply({
            content: "❌ Cet utilisateur n'est pas muté.",
            ephemeral: true,
          });
        }

        await member.timeout(
          null,
          `Démuté par ${interaction.user.tag} | ${reason}`
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("🔊 Utilisateur démuté")
          .addFields(
            { name: "Utilisateur", value: `${user.tag}`, inline: true },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du unmute:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du démute.",
          ephemeral: true,
        });
      }
    },
  },

  // TIMEOUT COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("timeout")
      .setDescription(
        "Mettre un utilisateur en timeout avec sélection de durée"
      )
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à timeout")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du timeout")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de timeout des membres.",
          ephemeral: true,
        });
      }

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
            content: "❌ Vous ne pouvez pas timeout cet utilisateur.",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("⏰ Timeout - Sélection de durée")
          .setDescription(
            `**Utilisateur:** ${user}\n**Raison:** ${reason}\n\nChoisissez la durée du timeout :`
          )
          .setTimestamp();

        const buttons = [
          new ButtonBuilder()
            .setCustomId(`timeout_1min_${user.id}`)
            .setLabel("1 minute")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`timeout_30min_${user.id}`)
            .setLabel("30 minutes")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`timeout_600min_${user.id}`)
            .setLabel("600 minutes")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`timeout_cancel_${user.id}`)
            .setLabel("Annuler")
            .setStyle(ButtonStyle.Danger),
        ];

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.reply({ embeds: [embed], components: [row] });
      } catch (error) {
        console.error("Erreur lors du timeout:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },

  // UNTIMEOUT COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("untimeout")
      .setDescription("Retirer le timeout d'un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à qui retirer le timeout")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison du retrait de timeout")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de retirer les timeouts.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      try {
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.isCommunicationDisabled()) {
          return interaction.reply({
            content: "❌ Cet utilisateur n'est pas en timeout.",
            ephemeral: true,
          });
        }

        await member.timeout(
          null,
          `Timeout retiré par ${interaction.user.tag} | ${reason}`
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("✅ Timeout retiré")
          .addFields(
            { name: "Utilisateur", value: `${user.tag}`, inline: true },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du untimeout:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },
];
