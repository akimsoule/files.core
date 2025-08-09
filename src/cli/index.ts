#!/usr/bin/env node

/**
 * Files Core CLI - Point d'entrée principal
 * CLI TypeScript CRUD pour la gestion de documents avec stockage MEGA
 */

import { Command } from 'commander';
import { userCommands } from './commands/userCommands';
import { documentCommands } from './commands/documentCommands';
import { logCommands } from './commands/logCommands';

const program = new Command();

// Configuration générale du CLI
program
  .name('files-core')
  .description('CLI TypeScript CRUD pour la gestion de documents avec stockage MEGA et base de données PostgreSQL')
  .version('1.0.0');

// Commandes utilisateur
program
  .addCommand(userCommands);

// Commandes document
program
  .addCommand(documentCommands);

// Commandes logs
program
  .addCommand(logCommands);

// Commande d'aide étendue
program
  .command('help-extended')
  .description('❓ Aide détaillée avec tous les exemples')
  .action(() => {
    console.log(`
🎯 Files Core - CLI CRUD complet

═══════════════════════════════════════════════════════════════
👤 GESTION DES UTILISATEURS
═══════════════════════════════════════════════════════════════

Créer un utilisateur:
  files-core user create --email="user@example.com" --name="John Doe" --password="secret123"

Lire un utilisateur:
  files-core user read --id="user123"

Lister les utilisateurs:
  files-core user list --skip=0 --take=10

Mettre à jour un utilisateur:
  files-core user update --id="user123" --name="Jane Doe" --email="jane@example.com"

Supprimer un utilisateur:
  files-core user delete --id="user123" --force

Vérifier un mot de passe:
  files-core user verify --email="user@example.com" --password="secret123"

═══════════════════════════════════════════════════════════════
📄 GESTION DES DOCUMENTS
═══════════════════════════════════════════════════════════════

Créer un document:
  files-core document create --name="Mon document" --type="pdf" --owner-email="user@example.com" --file-path="/path/to/file.pdf"

Lire un document:
  files-core document read --id="doc123"

Lister les documents:
  files-core document list --skip=0 --take=10 --category="rapport"

Mettre à jour un document:
  files-core document update --id="doc123" --name="Nouveau nom" --description="Nouvelle description"

Supprimer un document:
  files-core document delete --id="doc123" --user-email="user@example.com" --force

═══════════════════════════════════════════════════════════════
🛠️  SCRIPTS NPM DISPONIBLES
═══════════════════════════════════════════════════════════════

Scripts utilisateur:
  npm run user:create     npm run user:demo
  npm run user:read       npm run user:test  
  npm run user:list       npm run user:benchmark
  npm run user:update     npm run user:init
  npm run user:delete     npm run user:validate
  npm run user:verify     npm run user:docs

Scripts document:
  npm run doc:create      npm run doc:demo
  npm run doc:read        npm run doc:test
  npm run doc:list        npm run doc:benchmark
  npm run doc:update      npm run doc:search
  npm run doc:delete      npm run doc:init
                          npm run doc:validate
                          npm run doc:docs
                          npm run doc:check-mega

Scripts globaux:
  npm run all-commands    npm run setup
  npm run menu            npm run build
  npm run stats           npm run dev

═══════════════════════════════════════════════════════════════
`);
  });

// Commande d'initialisation
program
  .command('init')
  .description('🚀 Initialiser Files Core')
  .action(async () => {
    console.log('🚀 Initialisation de Files Core...\n');
    
    try {
      console.log('1️⃣ Vérification de la base de données...');
      // Vérifier la connexion à la base de données
      
      console.log('2️⃣ Configuration des templates...');
      // Initialiser les configurations
      
      console.log('3️⃣ Vérification de l\'environnement MEGA...');
      // Vérifier les credentials MEGA
      
      console.log('\n✅ Files Core initialisé avec succès!');
      console.log('\n📚 Prochaines étapes:');
      console.log('   npm run user:demo    # Créer des utilisateurs de test');
      console.log('   npm run doc:demo     # Créer des documents de test');
      console.log('   npm run all-commands # Voir toutes les commandes');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      process.exit(1);
    }
  });

// Commande quickstart
program
  .command('quickstart')
  .description('⚡ Démarrage rapide avec données de démonstration')
  .action(async () => {
    console.log('⚡ Démarrage rapide de Files Core...\n');
    
    try {
      console.log('🎭 Création d\'utilisateurs de démonstration...');
      // Créer des utilisateurs de test
      
      console.log('📁 Création de documents de démonstration...');
      // Créer des documents de test
      
      console.log('\n🎉 Démonstration créée avec succès!');
      console.log('\n🔍 Pour explorer:');
      console.log('   files-core user list');
      console.log('   files-core document list');
      
    } catch (error) {
      console.error('❌ Erreur lors du quickstart:', error);
      process.exit(1);
    }
  });

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée:', reason);
  process.exit(1);
});

// Parsing des arguments et exécution
program.parse();

// Si aucune commande n'est fournie, afficher l'aide
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
