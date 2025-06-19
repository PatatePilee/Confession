const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const { Collection } = require("discord.js");
const ytdl = require("ytdl-core");
const { getLogger } = require("../utils");

const logger = getLogger("MusicPlayer");

class MusicPlayer {
  constructor() {
    this.queues = new Collection();
    this.players = new Collection();
    this.connections = new Collection();
  }

  async join(interaction) {
    const member = interaction.member;
    if (!member.voice.channel) {
      throw new Error(
        "Vous devez être dans un salon vocal pour utiliser cette commande."
      );
    }

    const connection = joinVoiceChannel({
      channelId: member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        connection.destroy();
        this.connections.delete(interaction.guild.id);
        this.players.delete(interaction.guild.id);
        this.queues.delete(interaction.guild.id);
      }
    });

    this.connections.set(interaction.guild.id, connection);
    return connection;
  }

  async play(interaction, query) {
    try {
      const connection =
        this.connections.get(interaction.guild.id) ||
        (await this.join(interaction));
      const player =
        this.players.get(interaction.guild.id) || createAudioPlayer();

      let url = query;

      // Si ce n'est pas une URL YouTube, on fait une recherche basique
      if (!ytdl.validateURL(query)) {
        // Pour une recherche simple, on peut utiliser l'API YouTube ou juste construire une URL
        // Pour l'instant, on va juste dire à l'utilisateur d'utiliser une URL YouTube
        throw new Error(
          "Veuillez fournir une URL YouTube valide pour le moment."
        );
      }

      // Vérifier que l'URL est valide
      if (!ytdl.validateURL(url)) {
        throw new Error("URL YouTube invalide.");
      }

      // Obtenir les informations de la vidéo
      const info = await ytdl.getInfo(url);

      // Créer le stream audio
      const stream = ytdl(url, {
        filter: "audioonly",
        highWaterMark: 1 << 25,
        quality: "highestaudio",
      });

      const resource = createAudioResource(stream, {
        inlineVolume: true,
      });
      resource.volume.setVolume(0.5);

      player.play(resource);
      connection.subscribe(player);

      this.players.set(interaction.guild.id, player);

      return {
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds),
        url: info.videoDetails.video_url,
      };
    } catch (error) {
      logger.error("Erreur lors de la lecture:", error);
      throw error;
    }
  }

  stop(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      player.stop();
    }
  }

  pause(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      player.pause();
    }
  }

  resume(guildId) {
    const player = this.players.get(guildId);
    if (player) {
      player.unpause();
    }
  }

  setVolume(guildId, volume) {
    const player = this.players.get(guildId);
    if (player && player.state.resource && player.state.resource.volume) {
      player.state.resource.volume.setVolume(volume / 100);
    }
  }

  disconnect(guildId) {
    const connection = this.connections.get(guildId);
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
      this.players.delete(guildId);
      this.queues.delete(guildId);
    }
  }
}

module.exports = new MusicPlayer();
