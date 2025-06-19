const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const { Collection } = require("discord.js");
const play = require("play-dl");
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

      let stream;
      let info;

      if (play.yt_validate(query) === "video") {
        info = await play.video_info(query);
        stream = await play.stream_from_info(info);
      } else {
        const searchResults = await play.search(query, { limit: 1 });
        if (!searchResults.length) {
          throw new Error("Aucun résultat trouvé.");
        }
        info = await play.video_info(searchResults[0].url);
        stream = await play.stream_from_info(info);
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      resource.volume.setVolume(0.5);

      player.play(resource);
      connection.subscribe(player);

      this.players.set(interaction.guild.id, player);

      return {
        title: info.video_details.title,
        duration: info.video_details.durationInSec,
        url: info.video_details.url,
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
    if (player) {
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
