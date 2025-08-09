#!/usr/bin/env ts-node

/**
 * Documentation automatique des scripts utilisateur
 * Style gpt-crawler avec génération de README
 */

import * as fs from 'fs';
import * as path from 'path';

class UserDocGenerator {
  
  /**
   * Génère la documentation complète
   */
  generateDocs(): void {
    console.log('📚 Génération de la documentation utilisateur...\n');
    
    const readme = this.buildReadmeContent();
    const outputPath = './USER_CRUD_README.md';
    
    fs.writeFileSync(outputPath, readme);
    
    console.log(`✅ Documentation générée: ${outputPath}`);
    console.log('\n📖 Contenu de la documentation:\n');
    console.log(readme);
  }
  
  /**
   * Construit le contenu du README
   */
  private buildReadmeContent(): string {
    return `# 👤 Scripts CRUD Utilisateur - Files Core

Documentation automatiquement générée le ${new Date().toLocaleDateString('fr-FR')}

## 🚀 Démarrage rapide

\`\`\`bash
# Initialiser la configuration
npm run user:init

# Valider les templates
npm run user:validate

# Créer des utilisateurs de démo
npm run user:demo

# Lancer un test CRUD complet
npm run user:test
\`\`\`

## 📋 Commandes disponibles

### Scripts CRUD de base
\`\`\`bash
npm run user:create      # 👤 Créer un utilisateur
npm run user:read        # 🔍 Lire un utilisateur
npm run user:list        # 📋 Lister les utilisateurs
npm run user:update      # ✏️  Mettre à jour un utilisateur
npm run user:delete      # 🗑️  Supprimer un utilisateur
npm run user:verify      # 🔐 Vérifier un mot de passe
npm run user:help        # ❓ Aide CRUD
\`\`\`

### Scripts d'exemple et tests
\`\`\`bash
npm run user:demo        # 🎭 Créer des utilisateurs de démo
npm run user:test        # 🧪 Test CRUD complet
npm run user:benchmark   # ⚡ Mesurer les performances
\`\`\`

### Configuration et validation
\`\`\`bash
npm run user:init        # 🔧 Initialiser la configuration
npm run user:validate    # 🔍 Valider les templates
npm run user:show-config # 📋 Afficher la configuration
\`\`\`

## 📄 Templates

Les templates définissent les données utilisées par chaque opération :

### Structure des templates
\`\`\`
template/user/
├── create/index.ts      # Données pour créer un utilisateur
├── read/index.ts        # ID pour lire un utilisateur
├── list/index.ts        # Paramètres de pagination
├── update/index.ts      # Données de mise à jour
├── delete/index.ts      # ID + confirmation de suppression
└── verify/index.ts      # Email + mot de passe
\`\`\`

### Exemple de template (create)
\`\`\`typescript
const data = {
  email: "jane.smith@example.com",
  name: "Jane Smith",
  password: "motdepasse123",
};

export default data;
\`\`\`

## ⚙️ Configuration

Le fichier \`files-core-config.json\` contient :

\`\`\`json
{
  "templates": {
    "basePath": "./template/user",
    "operations": ["create", "read", "list", "update", "delete", "verify"]
  },
  "validation": {
    "required": ["email", "name", "password"],
    "optional": ["id", "skip", "take", "force"]
  },
  "defaults": {
    "pagination": {
      "skip": 0,
      "take": 10
    },
    "security": {
      "minPasswordLength": 8,
      "requireUppercase": true,
      "requireNumbers": true
    }
  }
}
\`\`\`

## 🔧 Architecture des scripts

### Scripts principaux
- \`src/scripts/userCrud.ts\` - Gestionnaire CRUD principal
- \`src/scripts/userExamples.ts\` - Scripts d'exemple et tests
- \`src/scripts/userConfig.ts\` - Gestionnaire de configuration

### Pattern d'utilisation
1. **Templates** : Définissent les données d'entrée
2. **Scripts** : Chargent les templates et exécutent les opérations
3. **Configuration** : Valide et configure le comportement

## 🎯 Cas d'usage

### Développement
\`\`\`bash
# Setup initial
npm run user:init
npm run user:validate

# Développement avec des données de test
npm run user:demo
npm run user:test
\`\`\`

### Production
\`\`\`bash
# Personnaliser les templates selon vos besoins
# Puis utiliser les commandes CRUD individuelles
npm run user:create
npm run user:list
\`\`\`

### Debugging
\`\`\`bash
# Valider la configuration
npm run user:validate

# Tester les performances
npm run user:benchmark

# Voir la configuration
npm run user:show-config
\`\`\`

## 📝 Notes

- Les templates sont en TypeScript et exportent un objet \`data\`
- La configuration est validée automatiquement
- Les scripts sont conçus pour être facilement étendus
- Pattern inspiré de gpt-crawler pour la flexibilité

## 🔗 Liens utiles

- [Guide principal](./README.md)
- [Instructions Copilot](./.github/copilot-instructions.md)
- [Configuration du projet](./files-core-config.json)

---

*Documentation générée automatiquement par \`npm run user:docs\`*
`;
  }
  
  /**
   * Affiche la liste de toutes les commandes
   */
  listCommands(): void {
    console.log(`
🎯 Liste complète des commandes utilisateur

📦 Scripts CRUD de base:
  npm run user:create      👤 Créer un utilisateur
  npm run user:read        🔍 Lire un utilisateur  
  npm run user:list        📋 Lister les utilisateurs
  npm run user:update      ✏️  Mettre à jour un utilisateur
  npm run user:delete      🗑️  Supprimer un utilisateur
  npm run user:verify      🔐 Vérifier un mot de passe
  npm run user:help        ❓ Aide CRUD

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
  npm run user:commands    📋 Lister toutes les commandes
`);
  }
  
  /**
   * Affiche l'aide
   */
  showHelp(): void {
    console.log(`
📚 Générateur de documentation utilisateur

Usage: npm run user:docs [command]

Commandes:
  generate     📚 Générer la documentation complète
  commands     📋 Lister toutes les commandes
  help         ❓ Afficher cette aide

Examples:
  npm run user:docs generate
  npm run user:docs commands
`);
  }
}

// Point d'entrée principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const docGenerator = new UserDocGenerator();
  
  switch (command) {
    case 'generate':
      docGenerator.generateDocs();
      break;
    case 'commands':
      docGenerator.listCommands();
      break;
    case 'help':
    default:
      if (!command) {
        // Par défaut, générer la doc
        docGenerator.generateDocs();
      } else {
        docGenerator.showHelp();
      }
      break;
  }
}

if (require.main === module) {
  main();
}
