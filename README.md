# Files Core CLI

Un CLI TypeScript CRUD pour la gestion de documents avec stockage MEGA et base de données SQLite.

## 🚀 Fonctionnalités

- **Gestion des utilisateurs** : Création, lecture, mise à jour et suppression
- **Gestion des documents** : Upload, métadonnées et stockage MEGA
- **Stockage MEGA** : Stockage sécurisé des fichiers sur MEGA
- **Logs complets** : Traçabilité de toutes les actions importantes
- **Interface CLI intuitive** : Commandes simples et menu interactif
- **Tests fonctionnels** : Suite de tests complète avec services directs

## 📋 Prérequis

- Node.js >= 16.0.0
- Compte MEGA (optionnel, pour le stockage)

## ⚙️ Installation Rapide

### 🚀 Configuration automatique (recommandée)
```bash
git clone <repository-url>
cd files-core
./setup.sh
```

### 📖 Configuration manuelle
```bash
git clone <repository-url>
cd files-core
npm install
npm run prisma:generate
npm run build
npm run seed
```

## 🔧 Configuration

### Fichier `.env` (optionnel)
```env
# Configuration MEGA pour le stockage de fichiers (optionnel)
MEGA_EMAIL="votre.email@example.com"
MEGA_PASSWORD="votre_mot_de_passe"

# Configuration optionnelle
NODE_ENV="development"
LOG_LEVEL="info"
```

> **Note** : Pas besoin de `DATABASE_URL` - SQLite est configuré automatiquement dans `prisma/dev.db`

## 🎯 Utilisation

### 🎮 Menu interactif (recommandé)
```bash
npm run menu
```

### 🧪 Tests fonctionnels
```bash
npm run test              # Tests complets avec MEGA
npm run test-fast         # Tests rapides sans MEGA
npm run test-strict       # Tests en mode strict
npm run test-no-clear     # Tests sans nettoyage DB
```

### 👤 Gestion des utilisateurs
```bash
npm run dev user create -e john@example.com -n "John Doe" -p "password123"
npm run dev user list
npm run dev user show <user-id>
npm run dev user update <user-id> -n "Nouveau nom"
npm run dev user delete <user-id> --force
```

### 📄 Gestion des documents
```bash
npm run dev doc create -n "Document" -t "txt" -c "test" -o <user-id> -f "./file.txt"
npm run dev doc list
npm run dev doc show <document-id>
npm run dev doc update <document-id> -n "Nouveau nom" --user <user-id>
npm run dev doc delete <document-id> --user <user-id> --force
```

### 📊 Consultation des logs
```bash
npm run dev log list
npm run dev log user <user-id>
npm run dev log stats
```

## 🗄️ Base de Données

### Technologie
- **SQLite** : Base de données locale dans `prisma/dev.db`
- **Prisma ORM** : Interface moderne pour la base de données
- **Migrations automatiques** : Schéma géré via Prisma

### Modèles principaux
- **User** : Utilisateurs du système (id, email, name, passwordHash)
- **Document** : Documents avec métadonnées (id, name, type, category, megaUrl, etc.)
- **Log** : Historique des actions (id, action, entity, userId, details, timestamp)

### Relations
- Un utilisateur peut avoir plusieurs documents (`User.documents`)
- Chaque document appartient à un utilisateur (`Document.owner`)
- Les logs sont liés aux utilisateurs (`Log.user`)

## 📂 Structure du projet

```
files-core/
├── src/
│   ├── cli/                    # Interface CLI
│   │   ├── commands/           # Commandes CLI organisées
│   │   ├── index.ts           # Point d'entrée CLI
│   │   └── scripts/           # Scripts utilitaires
│   ├── services/              # Services métier
│   │   ├── userService.ts     # Gestion des utilisateurs
│   │   ├── documentService.ts # Gestion des documents
│   │   ├── logService.ts      # Système de logs
│   │   ├── megaStorage.ts     # Stockage MEGA
│   │   └── database.ts        # Singleton Prisma
│   └── beans/                 # Types et interfaces
├── prisma/
│   ├── schema.prisma          # Schéma SQLite
│   ├── dev.db                 # Base de données SQLite
│   └── migrations/            # Historique des migrations
├── z_scripts/                 # Scripts de développement
│   ├── test.ts               # Tests fonctionnels
│   ├── test-with-mega.sh     # Tests avec MEGA
│   ├── menu.ts               # Menu interactif
│   ├── seed.ts               # Données de test
│   └── test.txt              # Fichier de test
├── setup.sh                  # Configuration automatique
├── package.json              # Configuration npm
└── README.md                 # Documentation
```

## 🛠️ Scripts disponibles

### 🏗️ Build et développement
```bash
npm run build          # Compiler le TypeScript
npm run start          # Exécuter la version compilée
npm run dev            # CLI en mode développement
npm run watch          # Mode watch avec rechargement auto
npm run clean          # Nettoyer dist/
```

### 🧪 Tests et validation
```bash
npm run test           # Tests fonctionnels complets
npm run test-functional # Alias pour les tests complets
npm run test-fast      # Tests rapides (sans MEGA)
npm run test-strict    # Tests en mode strict
npm run test-no-clear  # Tests sans nettoyage DB
npm run menu           # Menu interactif pour développeurs
```

### 🗄️ Base de données (Prisma)
```bash
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Appliquer les migrations
npm run prisma:studio    # Ouvrir Prisma Studio
npm run prisma:reset     # Réinitialiser la base de données
npm run prisma:init      # Migration initiale
npm run prisma:deploy    # Déployer les migrations
```

### 🌱 Données et configuration
```bash
npm run seed           # Initialiser avec des données de test
npm run setup          # Configuration automatique complète
npm run setup-dev      # Setup pour développement
npm run setup-fresh    # Setup complet avec reset DB
```

## 🏗️ Développement

### Architecture des services
- **Services** : Logique métier dans `src/services/`
- **CLI** : Interface utilisateur dans `src/cli/`
- **Tests** : Tests fonctionnels directs (pas de CLI spawn)
- **Logs** : Traçabilité complète de toutes les actions

### Ajouter une nouvelle fonctionnalité
1. Créer/modifier le service dans `src/services/`
2. Ajouter les commandes CLI dans `src/cli/commands/`
3. Ajouter les tests dans `z_scripts/test.ts`
4. Mettre à jour le menu dans `z_scripts/menu.ts`

### Tests fonctionnels
Les tests utilisent directement les services TypeScript (pas de spawn CLI) :
- **Performance** : ~2.4s au lieu de 10s+
- **Débogage** : Plus facile à debugger
- **Couverture** : Vrais tests unitaires des services

## 🔐 Sécurité

- **Mots de passe** : Hachés avec bcrypt (service UserService)
- **Stockage MEGA** : Fichiers stockés de manière sécurisée
- **Logs** : Traçabilité complète sans données sensibles
- **SQLite** : Base de données locale sécurisée

## 🐛 Dépannage

### Base de données SQLite
```bash
# Réinitialiser complètement
npm run prisma:reset

# Régénérer le client Prisma
npm run prisma:generate

# Vérifier le schéma
npm run prisma:studio
```

### Problèmes MEGA
```bash
# Tester sans MEGA
npm run test-fast

# Vérifier la configuration MEGA
echo $MEGA_EMAIL $MEGA_PASSWORD
```

### Problèmes de compilation
```bash
# Nettoyer et reconstruire
npm run clean
npm install
npm run build
```

### Tests qui échouent
```bash
# Tests avec détails
npm run test-strict

# Tests sans nettoyage pour déboguer
npm run test-no-clear
```

## 🚀 Démarrage Rapide

### Pour commencer immédiatement
```bash
git clone <repository-url>
cd files-core
./setup.sh          # Configuration automatique
npm run menu         # Menu interactif
```

### Pour développer
```bash
npm run seed         # Données de test
npm run test         # Valider le fonctionnement
npm run dev help     # Explorer le CLI
```

## 📊 Statut du Projet

- ✅ **Architecture** : Services TypeScript propres
- ✅ **Tests** : Suite de tests fonctionnels complète
- ✅ **Base de données** : SQLite avec Prisma ORM
- ✅ **Stockage** : Intégration MEGA opérationnelle
- ✅ **CLI** : Interface complète et intuitive
- ✅ **Documentation** : Guides et exemples complets

## 📝 Historique des Corrections

### ❌ Erreurs corrigées dans la documentation

1. **Base de données** : PostgreSQL → **SQLite** (`prisma/dev.db`)
2. **Configuration** : `DATABASE_URL` obligatoire → **Configuration MEGA optionnelle**
3. **Structure** : `src/commands/` → **`src/cli/commands/`** (structure réelle)
4. **Scripts npm** : Scripts basiques → **Suite complète** (test, menu, seed, setup)
5. **Installation** : Setup PostgreSQL complexe → **`./setup.sh` automatique**

### ✅ Améliorations apportées

- **Documentation réaliste** : Fonctionnalités réellement disponibles
- **Instructions simples** : Setup automatique one-click
- **Workflows complets** : Tests variés, menu interactif, outils développement
- **Troubleshooting adapté** : Solutions SQLite et MEGA optionnel
- **Architecture moderne** : Tests fonctionnels directs (2.4s vs 10s+)

### 🎯 Cohérence validée

Le README reflète fidèlement :
- ✅ Scripts `package.json` réels
- ✅ Structure `src/cli/` actuelle  
- ✅ Base SQLite opérationnelle
- ✅ Outils développement `z_scripts/`
- ✅ Configuration `.env` optionnelle
- ✅ Tests fonctionnels validés

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pusher sur la branche
5. Ouvrir une Pull Request
