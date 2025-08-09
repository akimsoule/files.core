#!/usr/bin/env ts-node

/**
 * Documentation automatique des scripts document
 * Style gpt-crawler avec génération de README
 */

import * as fs from 'fs';
import * as path from 'path';

class DocumentDocGenerator {
  
  /**
   * Génère la documentation complète pour les documents
   */
  generateDocs(): void {
    console.log('📚 Génération de la documentation document...\n');
    
    const readme = this.buildReadmeContent();
    const outputPath = './DOCUMENT_CRUD_README.md';
    
    fs.writeFileSync(outputPath, readme);
    
    console.log(`✅ Documentation générée: ${outputPath}`);
    console.log('\n📖 Contenu de la documentation:\n');
    console.log(readme);
  }
  
  /**
   * Construit le contenu du README pour les documents
   */
  private buildReadmeContent(): string {
    return `# 📄 Scripts CRUD Document - Files Core

Documentation automatiquement générée le ${new Date().toLocaleDateString('fr-FR')}

## 🚀 Démarrage rapide

\`\`\`bash
# Initialiser la configuration
npm run doc:init

# Valider les templates
npm run doc:validate

# Créer des documents de démo
npm run doc:demo

# Lancer un test CRUD complet
npm run doc:test

# Vérifier l'environnement MEGA
npm run doc:check-mega
\`\`\`

## 📋 Commandes disponibles

### Scripts CRUD de base
\`\`\`bash
npm run doc:create       # 📄 Créer un document
npm run doc:read         # 🔍 Lire un document
npm run doc:list         # 📋 Lister les documents
npm run doc:update       # ✏️  Mettre à jour un document
npm run doc:delete       # 🗑️  Supprimer un document
npm run doc:help         # ❓ Aide CRUD
\`\`\`

### Scripts d'exemple et tests
\`\`\`bash
npm run doc:demo         # 📁 Créer des documents de démo
npm run doc:test         # 🧪 Test CRUD complet
npm run doc:benchmark    # ⚡ Mesurer les performances
npm run doc:search       # 🔍 Tester la recherche et filtrage
\`\`\`

### Configuration et validation
\`\`\`bash
npm run doc:init         # 🔧 Initialiser la configuration
npm run doc:validate     # 🔍 Valider les templates
npm run doc:show-config  # 📋 Afficher la configuration
npm run doc:check-mega   # 🔍 Vérifier l'environnement MEGA
\`\`\`

## 📄 Templates

Les templates définissent les données utilisées par chaque opération :

### Structure des templates
\`\`\`
template/document/
├── create/index.ts      # Données pour créer un document
├── read/index.ts        # ID pour lire un document
├── list/index.ts        # Paramètres de pagination
├── update/index.ts      # Données de mise à jour
└── delete/index.ts      # ID + confirmation de suppression
\`\`\`

### Exemple de template (create)
\`\`\`typescript
const data = {
  name: "Ma photo de vacances",
  type: "jpg",
  category: "personnel",
  description: "Photo prise pendant mes vacances d'été",
  tags: ["vacances", "été", "2024"],
  ownerEmail: "usename@domain.com",
  filePath: "/Users/username/Downloads/photo.jpg",
};

export default data;
\`\`\`

### Exemple de template (update)
\`\`\`typescript
const data = {
  id: "clm7x9y8z0000abc123def456",
  userEmail: "john.doe@example.com",
  name: "Rapport mensuel Q1 2025 - Version finale",
  description: "Rapport de performance du premier trimestre 2025 avec corrections",
  tags: ["rapport", "mensuel", "2025", "performance", "final"],
  isFavorite: true,
};

export default data;
\`\`\`

## ⚙️ Configuration

Le fichier \`files-core-config.json\` contient la section document :

\`\`\`json
{
  "document": {
    "templates": {
      "basePath": "./template/document",
      "operations": ["create", "read", "list", "update", "delete"]
    },
    "validation": {
      "required": ["name", "type", "ownerEmail", "filePath"],
      "optional": ["id", "category", "description", "tags", "skip", "take", "force"]
    },
    "defaults": {
      "pagination": {
        "skip": 0,
        "take": 10
      },
      "upload": {
        "maxFileSize": 100,
        "allowedTypes": ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "gif", "zip", "rar"]
      }
    },
    "storage": {
      "megaCredentials": {
        "required": true
      },
      "localPath": "./uploads"
    }
  }
}
\`\`\`

## 🔧 Architecture des scripts

### Scripts principaux
- \`src/scripts/documentCrud.ts\` - Gestionnaire CRUD principal
- \`src/scripts/documentExamples.ts\` - Scripts d'exemple et tests
- \`src/scripts/documentConfig.ts\` - Gestionnaire de configuration

### Pattern d'utilisation
1. **Templates** : Définissent les données d'entrée pour chaque opération
2. **Scripts** : Chargent les templates et exécutent les opérations
3. **Configuration** : Valide et configure le comportement
4. **Storage** : Intégration avec MEGA pour le stockage cloud

## 🔐 Configuration MEGA

Pour utiliser le stockage MEGA, configurez les variables d'environnement :

\`\`\`bash
# Dans votre fichier .env
MEGA_EMAIL=votre_email@example.com
MEGA_PASSWORD=votre_mot_de_passe
\`\`\`

Vérifiez la configuration avec :
\`\`\`bash
npm run doc:check-mega
\`\`\`

## 🎯 Cas d'usage

### Développement
\`\`\`bash
# Setup initial
npm run doc:init
npm run doc:validate
npm run doc:check-mega

# Développement avec des données de test
npm run doc:demo
npm run doc:test
\`\`\`

### Upload de fichiers
\`\`\`bash
# Personnaliser le template create avec votre fichier
# Puis créer le document
npm run doc:create
\`\`\`

### Recherche et filtrage
\`\`\`bash
# Tester les fonctionnalités de recherche
npm run doc:search

# Personnaliser les filtres dans template/document/list/
npm run doc:list
\`\`\`

### Performance et debugging
\`\`\`bash
# Mesurer les performances
npm run doc:benchmark

# Valider la configuration
npm run doc:validate

# Voir la configuration
npm run doc:show-config
\`\`\`

## 📊 Types de fichiers supportés

Par défaut, ces types sont autorisés :
- **Documents** : pdf, doc, docx, txt
- **Images** : jpg, jpeg, png, gif
- **Archives** : zip, rar

Vous pouvez modifier cette liste dans la configuration.

## 🔍 Fonctionnalités de recherche

Les documents peuvent être filtrés par :
- **Catégorie** : personnel, professionnel, rapport, etc.
- **Type** : extension du fichier
- **Tags** : mots-clés associés
- **Propriétaire** : email du créateur
- **Recherche textuelle** : dans le nom et la description

## 📝 Notes importantes

- Les fichiers sont stockés localement puis uploadés sur MEGA
- Les templates supportent tous les champs du modèle Document
- La validation automatique vérifie les types de fichiers
- Les scripts sont conçus pour être facilement étendus
- Pattern inspiré de gpt-crawler pour la flexibilité

## 🔗 Liens utiles

- [Guide principal](./README.md)
- [Instructions Copilot](./.github/copilot-instructions.md)
- [Configuration du projet](./files-core-config.json)
- [Scripts utilisateur](./USER_CRUD_README.md)

---

*Documentation générée automatiquement par \`npm run doc:docs\`*
`;
  }
  
  /**
   * Affiche la liste de toutes les commandes document
   */
  listCommands(): void {
    console.log(`
🎯 Liste complète des commandes document

📦 Scripts CRUD de base:
  npm run doc:create       📄 Créer un document
  npm run doc:read         🔍 Lire un document  
  npm run doc:list         📋 Lister les documents
  npm run doc:update       ✏️  Mettre à jour un document
  npm run doc:delete       🗑️  Supprimer un document
  npm run doc:help         ❓ Aide CRUD

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
  npm run doc:commands     📋 Lister toutes les commandes
`);
  }
  
  /**
   * Affiche l'aide
   */
  showHelp(): void {
    console.log(`
📚 Générateur de documentation document

Usage: npm run doc:docs [command]

Commandes:
  generate     📚 Générer la documentation complète
  commands     📋 Lister toutes les commandes
  help         ❓ Afficher cette aide

Examples:
  npm run doc:docs generate
  npm run doc:docs commands
`);
  }
}

// Point d'entrée principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const docGenerator = new DocumentDocGenerator();
  
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
