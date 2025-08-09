#!/usr/bin/env ts-node

/**
 * Script global pour afficher toutes les commandes CRUD disponibles
 * Utilisateur + Document
 */

class GlobalCommandsDisplay {
  
  /**
   * Affiche toutes les commandes disponibles
   */
  showAllCommands(): void {
    console.log(`
🎯 Files Core - Toutes les commandes CRUD disponibles

═══════════════════════════════════════════════════════════════
👤 COMMANDES UTILISATEUR
═══════════════════════════════════════════════════════════════

📦 Scripts CRUD de base:
  npm run user:create      👤 Créer un utilisateur
  npm run user:read        🔍 Lire un utilisateur
  npm run user:list        📋 Lister les utilisateurs
  npm run user:update      ✏️  Mettre à jour un utilisateur
  npm run user:delete      🗑️  Supprimer un utilisateur
  npm run user:verify      🔐 Vérifier un mot de passe
  npm run user:help        ❓ Aide CRUD utilisateur

🧪 Scripts d'exemple et tests:
  npm run user:demo        🎭 Créer des utilisateurs de démo
  npm run user:test        🧪 Test CRUD complet
  npm run user:benchmark   ⚡ Mesurer les performances

⚙️  Configuration et validation:
  npm run user:init        🔧 Initialiser la configuration
  npm run user:validate    🔍 Valider les templates
  npm run user:show-config 📋 Afficher la configuration

📚 Documentation:
  npm run user:docs        📚 Générer la documentation
  npm run user:commands    📋 Lister les commandes utilisateur

═══════════════════════════════════════════════════════════════
📄 COMMANDES DOCUMENT
═══════════════════════════════════════════════════════════════

📦 Scripts CRUD de base:
  npm run doc:create       📄 Créer un document
  npm run doc:read         🔍 Lire un document
  npm run doc:list         📋 Lister les documents
  npm run doc:update       ✏️  Mettre à jour un document
  npm run doc:delete       🗑️  Supprimer un document
  npm run doc:help         ❓ Aide CRUD document

🧪 Scripts d'exemple et tests:
  npm run doc:demo         📁 Créer des documents de démo
  npm run doc:test         🧪 Test CRUD complet
  npm run doc:benchmark    ⚡ Mesurer les performances
  npm run doc:search       🔍 Tester la recherche et filtrage

⚙️  Configuration et validation:
  npm run doc:init         🔧 Initialiser la configuration
  npm run doc:validate     🔍 Valider les templates
  npm run doc:show-config  📋 Afficher la configuration
  npm run doc:check-mega   🔍 Vérifier l'environnement MEGA

📚 Documentation:
  npm run doc:docs         📚 Générer la documentation
  npm run doc:commands     📋 Lister les commandes document

═══════════════════════════════════════════════════════════════
🚀 COMMANDES GLOBALES
═══════════════════════════════════════════════════════════════

🔧 Setup et configuration:
  npm run setup            🔧 Build + génération Prisma
  npm run init             🚀 Initialiser Files Core
  npm run demo             🎭 Démo rapide du système

🗃️  Base de données:
  npm run prisma:generate  ⚙️  Générer le client Prisma
  npm run prisma:migrate   📊 Migrer la base de données
  npm run prisma:studio    🖥️  Ouvrir Prisma Studio
  npm run prisma:reset     🔄 Reset de la base de données

🛠️  Développement:
  npm run dev              🔥 Mode développement
  npm run build            📦 Build du projet
  npm run start            ▶️  Démarrer l'application
  npm run watch            👀 Mode watch

📚 Aide et documentation:
  npm run guide            📖 Guide pour débutants
  npm run troubleshoot     🆘 Aide au dépannage
  npm run validate         ✅ Validation du projet
  npm run all-commands     🎯 Cette liste complète

═══════════════════════════════════════════════════════════════
🎯 DÉMARRAGE RAPIDE
═══════════════════════════════════════════════════════════════

# 1. Setup initial complet
npm run setup
npm run user:init
npm run doc:init

# 2. Validation
npm run user:validate
npm run doc:validate
npm run doc:check-mega

# 3. Créer des données de test
npm run user:demo
npm run doc:demo

# 4. Tests complets
npm run user:test
npm run doc:test

# 5. Documentation
npm run user:docs
npm run doc:docs

═══════════════════════════════════════════════════════════════
📁 STRUCTURE DES TEMPLATES
═══════════════════════════════════════════════════════════════

template/
├── user/
│   ├── create/index.ts
│   ├── read/index.ts
│   ├── list/index.ts
│   ├── update/index.ts
│   ├── delete/index.ts
│   └── verify/index.ts
└── document/
    ├── create/index.ts
    ├── read/index.ts
    ├── list/index.ts
    ├── update/index.ts
    └── delete/index.ts

src/scripts/
├── userCrud.ts
├── userExamples.ts
├── userConfig.ts
├── userDocs.ts
├── documentCrud.ts
├── documentExamples.ts
├── documentConfig.ts
└── documentDocs.ts

═══════════════════════════════════════════════════════════════
`);
  }
  
  /**
   * Affiche un menu interactif
   */
  showInteractiveMenu(): void {
    console.log(`
🎯 Files Core - Menu interactif

Que voulez-vous faire ?

1️⃣  Gestion des utilisateurs
   npm run user:commands

2️⃣  Gestion des documents  
   npm run doc:commands

3️⃣  Configuration et setup
   npm run setup && npm run user:init && npm run doc:init

4️⃣  Tests et démonstration
   npm run user:demo && npm run doc:demo

5️⃣  Documentation complète
   npm run user:docs && npm run doc:docs

6️⃣  Validation complète
   npm run user:validate && npm run doc:validate

🔍 Pour voir toutes les commandes : npm run all-commands
❓ Pour l'aide générale : npm run guide
`);
  }
  
  /**
   * Affiche les statistiques des commandes disponibles
   */
  showStats(): void {
    const userCommands = 12; // nombre de commandes user:*
    const docCommands = 15;  // nombre de commandes doc:*
    const globalCommands = 15; // autres commandes
    
    console.log(`
📊 Statistiques des commandes Files Core

👤 Commandes utilisateur : ${userCommands}
📄 Commandes document    : ${docCommands}
🛠️  Commandes globales   : ${globalCommands}
═══════════════════════════
🎯 Total                 : ${userCommands + docCommands + globalCommands} commandes

📁 Templates utilisateur : 6
📁 Templates document    : 5
📜 Scripts TypeScript   : 8
⚙️  Fichiers de config   : 1

🚀 Pattern gpt-crawler appliqué avec succès !
`);
  }
}

// Point d'entrée principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const display = new GlobalCommandsDisplay();
  
  switch (command) {
    case 'menu':
      display.showInteractiveMenu();
      break;
    case 'stats':
      display.showStats();
      break;
    case 'all':
    default:
      display.showAllCommands();
      break;
  }
}

if (require.main === module) {
  main();
}
