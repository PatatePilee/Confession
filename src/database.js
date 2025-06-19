const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { getLogger } = require("./utils");

const logger = getLogger("Database");

class Database {
  constructor() {
    const dbPath = path.join(__dirname, "..", "bot.db");

    // Créer le répertoire si nécessaire
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      this.db = new sqlite3.Database(dbPath);
      logger.info("Connexion à la base de données établie");
      this.init();
    } catch (error) {
      logger.error("Erreur connexion base de données:", error);
      // Utiliser une base de données en mémoire en cas d'échec
      this.db = new sqlite3.Database(":memory:");
      logger.info("Utilisation de la base de données en mémoire");
      this.init();
    }
  }

  init() {
    // Table des avertissements
    this.db.run(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Table des mutes temporaires
    this.db.run(`
            CREATE TABLE IF NOT EXISTS temp_mutes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role_id TEXT NOT NULL,
                end_time DATETIME NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Table des rôles de mute
    this.db.run(`
            CREATE TABLE IF NOT EXISTS mute_roles (
                guild_id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL
            )
        `);

    // Table pour les configurations de serveur
    this.db.run(
      `
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT,
                confession_channel_id TEXT,
                PRIMARY KEY (guild_id)
            )
        `,
      (err) => {
        if (err) logger.error("Erreur création table guild_config:", err);
      }
    );

    // Table pour les confessions
    this.db.run(
      `
            CREATE TABLE IF NOT EXISTS confessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                message_id TEXT,
                channel_id TEXT
            )
        `,
      (err) => {
        if (err) logger.error("Erreur création table confessions:", err);
      }
    );

    // Table des réponses aux confessions
    this.db.run(
      `
            CREATE TABLE IF NOT EXISTS confession_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                confession_id INTEGER NOT NULL,
                guild_id TEXT NOT NULL,
                response_text TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (confession_id) REFERENCES confessions (id)
            )
        `,
      (err) => {
        if (err)
          logger.error("Erreur création table confession_responses:", err);
      }
    );

    // Table des salons de confession
    this.db.run(`
            CREATE TABLE IF NOT EXISTS confession_channels (
                guild_id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL
            )
        `);

    logger.info("Base de données initialisée");
  }

  // Méthodes pour les avertissements
  addWarning(guildId, userId, moderatorId, reason) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)",
        [guildId, userId, moderatorId, reason],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getWarnings(guildId, userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC",
        [guildId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  clearWarnings(guildId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?",
        [guildId, userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Méthodes pour les mutes temporaires
  addTempMute(guildId, userId, roleId, endTime) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO temp_mutes (guild_id, user_id, role_id, end_time) VALUES (?, ?, ?, ?)",
        [guildId, userId, roleId, endTime.toISOString()],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getExpiredMutes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM temp_mutes WHERE end_time <= datetime("now")',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  removeTempMute(guildId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM temp_mutes WHERE guild_id = ? AND user_id = ?",
        [guildId, userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Méthodes pour les rôles de mute
  setMuteRole(guildId, roleId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR REPLACE INTO mute_roles (guild_id, role_id) VALUES (?, ?)",
        [guildId, roleId],
        function (err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  getMuteRole(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT role_id FROM mute_roles WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.role_id : null);
        }
      );
    });
  }

  // Méthodes pour les confessions
  async addConfession(guildId, text) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO confessions (guild_id, text) VALUES (?, ?)",
        [guildId, text],
        function (err) {
          if (err) {
            logger.error("Erreur addConfession:", err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async updateConfessionMessage(guildId, confessionId, messageId, channelId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE confessions SET message_id = ?, channel_id = ? WHERE id = ? AND guild_id = ?",
        [messageId, channelId, confessionId, guildId],
        function (err) {
          if (err) {
            logger.error("Erreur updateConfessionMessage:", err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getConfession(guildId, confessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT c.*, 
                 GROUP_CONCAT(cr.response_text) as responses_text
                 FROM confessions c
                 LEFT JOIN confession_responses cr ON c.id = cr.confession_id
                 WHERE c.guild_id = ? AND c.id = ?
                 GROUP BY c.id`,
        [guildId, confessionId],
        (err, row) => {
          if (err) {
            logger.error("Erreur getConfession:", err);
            reject(err);
          } else {
            if (row) {
              row.responses = row.responses_text
                ? row.responses_text.split(",")
                : [];
            }
            resolve(row);
          }
        }
      );
    });
  }

  async getLatestConfessions(guildId, limit = 5) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT c.*, 
                GROUP_CONCAT(cr.response_text) as responses_text
         FROM confessions c
         LEFT JOIN confession_responses cr ON c.id = cr.confession_id
         WHERE c.guild_id = ?
         GROUP BY c.id
         ORDER BY c.timestamp DESC
         LIMIT ?`,
        [guildId, limit],
        (err, rows) => {
          if (err) {
            logger.error("Erreur getLatestConfessions:", err);
            reject(err);
          } else {
            // Traiter les réponses
            const confessions = rows.map((row) => ({
              ...row,
              responses: row.responses_text
                ? row.responses_text.split(",")
                : [],
            }));
            resolve(confessions);
          }
        }
      );
    });
  }

  async addConfessionResponse(guildId, confessionId, responseText) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO confession_responses (confession_id, guild_id, response_text) VALUES (?, ?, ?)",
        [confessionId, guildId, responseText],
        function (err) {
          if (err) {
            logger.error("Erreur addConfessionResponse:", err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async setConfessionChannel(guildId, channelId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR REPLACE INTO guild_config (guild_id, confession_channel_id) VALUES (?, ?)",
        [guildId, channelId],
        function (err) {
          if (err) {
            logger.error("Erreur setConfessionChannel:", err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getConfessionChannel(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT confession_channel_id FROM guild_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) {
            logger.error("Erreur getConfessionChannel:", err);
            reject(err);
          } else {
            resolve(row ? row.confession_channel_id : null);
          }
        }
      );
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error("❌ Erreur fermeture base de données:", err);
      } else {
        console.log("✅ Base de données fermée");
      }
    });
  }
}

module.exports = Database;
 