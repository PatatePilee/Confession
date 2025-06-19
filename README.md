# 🤖 Bot Discord de Modération

Bot Discord avec commandes slash pour la modération, musique et confessions anonymes.

## ✨ Fonctionnalités

- 🛡️ **Modération complète** : ban, kick, mute, timeout, warnings
- 🎵 **Système musical** : lecture YouTube avec contrôles
- 💭 **Confessions anonymes** : système avec réponses modales
- 🔧 **Utilitaires** : clear, snipe, uptime, etc.

## 🚀 Déploiement

### Variables d'environnement requises :

```
DISCORD_TOKEN=votre_token_discord
CLIENT_ID=votre_client_id
```

### Déploiement local :

```bash
npm install
npm run deploy
npm start
```

### Déploiement sur Railway :

1. Connectez votre GitHub à Railway.app
2. Ajoutez les variables d'environnement
3. Le bot se déploie automatiquement !

## 📋 Commandes disponibles

- `/aide` - Afficher l'aide complète
- `/clear` - Supprimer des messages
- `/ban` - Bannir un utilisateur
- `/confession` - Système de confessions
- `/play` - Jouer de la musique
- Et bien plus...

## 🛠️ Technologies

- Discord.js v14
- Node.js 18+
- SQLite3
- Winston (logging)
