const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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

  // SETCONFESSION COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("setconfession")
      .setDescription("Définir le salon des confessions")
      .addChannelOption((option) =>
        option
          .setName("salon")
          .setDescription("Le salon où envoyer les confessions")
          .setRequired(true)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de gérer les salons.",
          ephemeral: true,
        });
      }

      const channel = interaction.options.getChannel("salon");

      try {
        await db.setConfessionChannel(interaction.guild.id, channel.id);

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("✅ Salon des confessions configuré")
          .setDescription(
            `Le salon ${channel} a été défini comme salon des confessions.\n\nLes membres peuvent maintenant utiliser \`/confession\` pour envoyer des confessions anonymes.`
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur setconfession:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },

  // CONFESSION COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("confession")
      .setDescription("Envoyer une confession anonyme")
      .addStringOption((option) =>
        option
          .setName("texte")
          .setDescription("Votre confession (sera anonyme)")
          .setRequired(true)
          .setMaxLength(2000)
      ),
    async execute(interaction) {
      const confessionText = interaction.options.getString("texte");

      try {
        // Vérifier qu'un salon de confession est configuré
        const confessionChannelId = await db.getConfessionChannel(
          interaction.guild.id
        );
        if (!confessionChannelId) {
          return interaction.reply({
            content:
              "❌ Aucun salon de confession n'est configuré. Un administrateur doit utiliser `/setconfession` d'abord.",
            ephemeral: true,
          });
        }

        const confessionChannel =
          interaction.guild.channels.cache.get(confessionChannelId);
        if (!confessionChannel) {
          return interaction.reply({
            content: "❌ Le salon de confession configuré n'existe plus.",
            ephemeral: true,
          });
        }

        // Ajouter la confession à la base de données
        const confessionId = await db.addConfession(
          interaction.guild.id,
          confessionText
        );

        // Créer l'embed de confession
        const embed = new EmbedBuilder()
          .setColor(0x9932cc)
          .setTitle(`💭 Confession #${confessionId}`)
          .setDescription(confessionText)
          .setFooter({
            text: `Posté le ${new Date().toLocaleDateString(
              "fr-FR"
            )} à ${new Date().toLocaleTimeString("fr-FR")}`,
          })
          .setTimestamp();

        // Créer le bouton de réponse
        const button = new ButtonBuilder()
          .setCustomId(`respond_confession_${confessionId}`)
          .setLabel("Répondre Anonymement")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("💬");

        const row = new ActionRowBuilder().addComponents(button);

        // Envoyer dans le salon de confession
        const confessionMsg = await confessionChannel.send({
          embeds: [embed],
          components: [row],
        });

        // Mettre à jour la confession avec les informations du message
        await db.updateConfessionMessage(
          interaction.guild.id,
          confessionId,
          confessionMsg.id,
          confessionChannel.id
        );

        // Confirmation éphémère
        await interaction.reply({
          content: `✅ Votre confession anonyme #${confessionId} a été envoyée dans ${confessionChannel}`,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Erreur confession:", error);
        await interaction.reply({
          content:
            "❌ Une erreur est survenue lors de l'envoi de la confession.",
          ephemeral: true,
        });
      }
    },
  },

  // CONFESSIONS COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("confessions")
      .setDescription("Voir les dernières confessions")
      .addIntegerOption((option) =>
        option
          .setName("nombre")
          .setDescription("Nombre de confessions à afficher (1-20)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20)
      ),
    async execute(interaction) {
      try {
        const limit = interaction.options.getInteger("nombre") || 5;

        const confessions = await db.getLatestConfessions(
          interaction.guild.id,
          limit
        );

        if (!confessions || confessions.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle("📭 Aucune confession")
            .setDescription(
              "Aucune confession n'a encore été envoyée sur ce serveur."
            )
            .setTimestamp();

          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`📋 ${confessions.length} Dernière(s) Confession(s)`)
          .setDescription(
            `Voici les ${confessions.length} confession(s) les plus récente(s) :`
          )
          .setTimestamp();

        confessions.forEach((confession) => {
          let confessionText = confession.text;
          if (confessionText.length > 100) {
            confessionText = confessionText.substring(0, 100) + "...";
          }

          const responsesCount = confession.responses
            ? confession.responses.length
            : 0;
          const responsesText =
            responsesCount > 0
              ? ` (${responsesCount} réponse${responsesCount > 1 ? "s" : ""})`
              : "";

          const timestamp = new Date(confession.timestamp).toLocaleDateString(
            "fr-FR"
          );

          embed.addFields({
            name: `💭 Confession #${confession.id}${responsesText}`,
            value: `*${confessionText}*\n📅 ${timestamp}`,
            inline: false,
          });
        });

        embed.setFooter({
          text: "Utilisez /confession <texte> pour envoyer une confession",
        });

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur confessions:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },

  // WARN COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Avertir un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à avertir")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("raison")
          .setDescription("Raison de l'avertissement")
          .setRequired(false)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de modérer des membres.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const reason =
        interaction.options.getString("raison") || "Aucune raison spécifiée";

      try {
        const warnings = await db.addWarning(
          interaction.guild.id,
          user.id,
          reason,
          interaction.user.id
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("⚠️ Avertissement ajouté")
          .addFields(
            { name: "Utilisateur", value: `${user.tag}`, inline: true },
            { name: "Modérateur", value: interaction.user.tag, inline: true },
            {
              name: "Total d'avertissements",
              value: warnings.toString(),
              inline: true,
            },
            { name: "Raison", value: reason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du warn:", error);
        await interaction.reply({
          content:
            "❌ Une erreur est survenue lors de l'ajout de l'avertissement.",
          ephemeral: true,
        });
      }
    },
  },

  // WARNINGS COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("Voir les avertissements d'un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur dont voir les avertissements")
          .setRequired(true)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content:
            "❌ Vous n'avez pas la permission de voir les avertissements.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");

      try {
        const warnings = await db.getWarnings(interaction.guild.id, user.id);

        if (!warnings || warnings.length === 0) {
          return interaction.reply({
            content: `ℹ️ ${user.tag} n'a aucun avertissement.`,
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle(`⚠️ Avertissements de ${user.tag}`)
          .setDescription(`Total: ${warnings.length} avertissement(s)`)
          .setTimestamp();

        const displayWarnings = warnings.slice(-5); // Afficher les 5 derniers

        displayWarnings.forEach((warning, index) => {
          const date = new Date(warning.timestamp).toLocaleDateString("fr-FR");
          embed.addFields({
            name: `Avertissement #${warnings.length - 5 + index + 1}`,
            value: `**Raison:** ${warning.reason}\n**Date:** ${date}\n**Modérateur:** <@${warning.moderator_id}>`,
            inline: false,
          });
        });

        if (warnings.length > 5) {
          embed.setFooter({
            text: `Affichage des 5 derniers avertissements sur ${warnings.length}`,
          });
        }

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors de warnings:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },

  // CLEARWARNINGS COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("clearwarnings")
      .setDescription("Effacer tous les avertissements d'un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur dont effacer les avertissements")
          .setRequired(true)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return interaction.reply({
          content:
            "❌ Vous n'avez pas la permission de gérer les avertissements.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");

      try {
        const count = await db.clearWarnings(interaction.guild.id, user.id);

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("✅ Avertissements effacés")
          .setDescription(
            `${count} avertissement(s) ont été effacés pour ${user.tag}`
          )
          .setFooter({ text: `Action effectuée par ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors de clearwarnings:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true,
        });
      }
    },
  },

  // SNIPE COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("snipe")
      .setDescription("Voir le dernier message supprimé"),
    async execute(interaction) {
      // Cette fonctionnalité nécessiterait un système de cache des messages supprimés
      await interaction.reply({
        content: "🔍 Fonction snipe non implémentée dans cette version.",
        ephemeral: true,
      });
    },
  },

  // FIND COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("find")
      .setDescription("Obtenir des informations sur un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à rechercher")
          .setRequired(true)
      ),
    async execute(interaction) {
      const user = interaction.options.getUser("utilisateur");

      try {
        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        const embed = new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(`👤 Informations sur ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields({
            name: "👤 Informations générales",
            value: `**Nom:** ${user.tag}\n**ID:** ${
              user.id
            }\n**Création du compte:** ${user.createdAt.toLocaleDateString(
              "fr-FR"
            )}\n**Avatar:** [Lien](${user.displayAvatarURL({
              dynamic: true,
            })})`,
            inline: false,
          });

        if (member) {
          embed.addFields({
            name: "🏠 Informations serveur",
            value: `**Surnom:** ${
              member.nickname || "Aucun"
            }\n**A rejoint le:** ${member.joinedAt.toLocaleDateString(
              "fr-FR"
            )}\n**Rôles:** ${
              member.roles.cache
                .filter((role) => role.name !== "@everyone")
                .map((role) => role.toString())
                .join(", ") || "Aucun"
            }\n**Permissions:** ${
              member.permissions.has(PermissionFlagsBits.Administrator)
                ? "Administrateur"
                : "Membre"
            }`,
            inline: false,
          });

          if (member.voice.channel) {
            embed.addFields({
              name: "🎤 Salon vocal",
              value: `**Salon:** ${member.voice.channel}\n**Muté:** ${
                member.voice.mute ? "Oui" : "Non"
              }\n**Sourdine:** ${member.voice.deaf ? "Oui" : "Non"}`,
              inline: false,
            });
          } else {
            embed.addFields({
              name: "🎤 Salon vocal",
              value: "Non connecté à un salon vocal",
              inline: false,
            });
          }
        }

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du find:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors de la recherche.",
          ephemeral: true,
        });
      }
    },
  },

  // UPTIME COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("uptime")
      .setDescription("Afficher les statistiques d'uptime du bot"),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle("📊 Statistiques d'Uptime")
        .setDescription("Surveillance du bot Discord")
        .addFields(
          {
            name: "🤖 Bot Discord",
            value: `**Statut:** 🟢 En ligne\n**Ping:** ${Math.round(
              interaction.client.ws.ping
            )}ms\n**Serveurs:** ${
              interaction.client.guilds.cache.size
            }\n**Utilisateurs:** ${interaction.client.users.cache.size}`,
            inline: true,
          },
          {
            name: "💻 Système",
            value: `**Node.js:** ${process.version}\n**Discord.js:** ${
              require("discord.js").version
            }\n**Processus:** ${process.pid}`,
            inline: true,
          }
        )
        .setFooter({
          text: `🕒 Dernière vérification: ${new Date().toLocaleString(
            "fr-FR"
          )}`,
        });

      await interaction.reply({ embeds: [embed] });
    },
  },

  // JOIN COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("join")
      .setDescription("Rejoindre le salon vocal d'un utilisateur")
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à rejoindre")
          .setRequired(true)
      ),
    async execute(interaction) {
      const user = interaction.options.getUser("utilisateur");

      if (!interaction.member.voice.channel) {
        return interaction.reply({
          content:
            "❌ Vous devez être dans un salon vocal pour utiliser cette commande.",
          ephemeral: true,
        });
      }

      try {
        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);
        if (!member) {
          return interaction.reply({
            content: "❌ Utilisateur non trouvé sur ce serveur.",
            ephemeral: true,
          });
        }

        if (!member.voice.channel) {
          return interaction.reply({
            content: "❌ Cet utilisateur n'est pas dans un salon vocal.",
            ephemeral: true,
          });
        }

        const targetChannel = member.voice.channel;
        const currentChannel = interaction.member.voice.channel;

        if (currentChannel === targetChannel) {
          return interaction.reply({
            content:
              "ℹ️ Vous êtes déjà dans le même salon vocal que cet utilisateur.",
            ephemeral: true,
          });
        }

        await interaction.member.voice.setChannel(targetChannel);

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("✅ Déplacement réussi")
          .setDescription(
            `Vous avez été déplacé vers ${targetChannel} pour rejoindre ${member}.`
          )
          .addFields({
            name: "📍 Informations",
            value: `**Salon précédent:** ${currentChannel}\n**Nouveau salon:** ${targetChannel}\n**Utilisateur rejoint:** ${member}`,
            inline: false,
          });

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du join:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du déplacement.",
          ephemeral: true,
        });
      }
    },
  },

  // MOVE COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("move")
      .setDescription("Déplacer un utilisateur vers un autre salon vocal")
      .addStringOption((option) =>
        option
          .setName("userid")
          .setDescription("L'ID de l'utilisateur à déplacer")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("channelid")
          .setDescription("L'ID du salon vocal de destination")
          .setRequired(true)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de déplacer des membres.",
          ephemeral: true,
        });
      }

      const userId = interaction.options.getString("userid");
      const channelId = interaction.options.getString("channelid");

      try {
        const member = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);
        if (!member) {
          return interaction.reply({
            content: "❌ Utilisateur non trouvé sur ce serveur.",
            ephemeral: true,
          });
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 2) {
          // Type 2 = Voice Channel
          return interaction.reply({
            content: "❌ Salon vocal non trouvé.",
            ephemeral: true,
          });
        }

        if (!member.voice.channel) {
          return interaction.reply({
            content: "❌ L'utilisateur n'est pas dans un salon vocal.",
            ephemeral: true,
          });
        }

        const oldChannel = member.voice.channel;
        await member.voice.setChannel(channel);

        const embed = new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle("🔄 Utilisateur déplacé")
          .addFields(
            {
              name: "Utilisateur",
              value: `${member} (\`${member.id}\`)`,
              inline: true,
            },
            { name: "De", value: oldChannel.toString(), inline: true },
            { name: "Vers", value: channel.toString(), inline: true },
            {
              name: "Modérateur",
              value: interaction.user.toString(),
              inline: false,
            }
          );

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du move:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du déplacement.",
          ephemeral: true,
        });
      }
    },
  },

  // MOVEMENTION COMMAND
  {
    data: new SlashCommandBuilder()
      .setName("movemention")
      .setDescription(
        "Déplacer un utilisateur vers un salon vocal (avec mentions)"
      )
      .addUserOption((option) =>
        option
          .setName("utilisateur")
          .setDescription("L'utilisateur à déplacer")
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("salon")
          .setDescription("Le salon vocal de destination")
          .setRequired(true)
      ),
    async execute(interaction) {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)
      ) {
        return interaction.reply({
          content: "❌ Vous n'avez pas la permission de déplacer des membres.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("utilisateur");
      const channel = interaction.options.getChannel("salon");

      try {
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.voice.channel) {
          return interaction.reply({
            content: "❌ L'utilisateur n'est pas dans un salon vocal.",
            ephemeral: true,
          });
        }

        if (channel.type !== 2) {
          // Type 2 = Voice Channel
          return interaction.reply({
            content: "❌ Le salon mentionné n'est pas un salon vocal.",
            ephemeral: true,
          });
        }

        const oldChannel = member.voice.channel;
        await member.voice.setChannel(channel);

        const embed = new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle("🔄 Utilisateur déplacé")
          .addFields(
            { name: "Utilisateur", value: member.toString(), inline: true },
            { name: "De", value: oldChannel.toString(), inline: true },
            { name: "Vers", value: channel.toString(), inline: true },
            {
              name: "Modérateur",
              value: interaction.user.toString(),
              inline: false,
            }
          );

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Erreur lors du movemention:", error);
        await interaction.reply({
          content: "❌ Une erreur est survenue lors du déplacement.",
          ephemeral: true,
        });
      }
    },
  },
];
