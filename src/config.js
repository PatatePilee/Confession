module.exports = {
  COLORS: {
    success: 0x00ff00,
    error: 0xff0000,
    warning: 0xffff00,
    info: 0x0099ff,
    ban: 0x8b0000,
    kick: 0xff6347,
    mute: 0x696969,
    confession: 0x9932cc,
  },

  EMOJIS: {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    music: "🎵",
    loading: "⏳",
    ban: "🔨",
    kick: "👢",
    mute: "🔇",
    unmute: "🔊",
  },

  PREFIX: "/",

  MUSIC_CONFIG: {
    maxVolume: 100,
    defaultVolume: 50,
    maxQueueSize: 50,
    searchResults: 1,
  },

  TIMEOUTS: {
    voiceConnection: 300000, // 5 minutes
    musicPlayer: 600000, // 10 minutes
    commandCooldown: 3000, // 3 secondes
  },

  PERMISSIONS: {
    MODERATION: [
      "BAN_MEMBERS",
      "KICK_MEMBERS",
      "MANAGE_MESSAGES",
      "MODERATE_MEMBERS",
    ],
    MUSIC: ["CONNECT", "SPEAK", "USE_VAD"],
  },
};
