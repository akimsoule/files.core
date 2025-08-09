#!/usr/bin/env ts-node

/**
 * Menu interactif pour Files Core CLI
 * Interface console pour naviguer dans les fonctionnalités du projet
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

interface MenuOption {
  key: string;
  description: string;
  command: string;
  isScript?: boolean;
}

const menuOptions: MenuOption[] = [
  // Tests
  { key: '1', description: '🧪 Tests complets (avec MEGA)', command: 'npm test' },
  { key: '2', description: '⚡ Tests rapides (sans MEGA)', command: 'npm run test-fast' },
  { key: '3', description: '🔒 Tests en mode strict', command: 'npm run test-strict' },
  { key: '4', description: '💾 Tests sans nettoyage DB', command: 'npm run test-no-clear' },
  
  // CLI Files Core
  { key: '5', description: '👤 Gestion des utilisateurs', command: 'npm run dev user --help' },
  { key: '6', description: '📄 Gestion des documents', command: 'npm run dev document --help' },
  { key: '7', description: '📊 Consultation des logs', command: 'npm run dev log --help' },
  
  // Base de données
  { key: '8', description: '🗄️  Prisma Studio', command: 'npm run prisma:studio' },
  { key: '9', description: '🌱 Initialiser données test', command: 'npm run seed' },
  { key: '10', description: '🔄 Reset base de données', command: 'npm run prisma:reset' },
  
  // Développement
  { key: '11', description: '🔨 Build du projet', command: 'npm run build' },
  { key: '12', description: '🚀 Démarrer CLI', command: 'npm run dev --help' },
  { key: '13', description: '👀 Mode watch', command: 'npm run watch' },
  
  // Utilitaires
  { key: '14', description: '🧹 Nettoyer dist/', command: 'npm run clean' },
  { key: '15', description: '📦 Setup complet', command: 'npm run setup-fresh' },
];

function displayMenu() {
  console.clear();
  console.log('🚀 ═══════════════════════════════════════════════════════════');
  console.log('   FILES CORE CLI - MENU INTERACTIF');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // Grouper les options par catégorie
  const groups = [
    { title: '🧪 TESTS', start: 1, end: 4 },
    { title: '⚙️  CLI COMMANDS', start: 5, end: 7 },
    { title: '🗄️  DATABASE', start: 8, end: 10 },
    { title: '🔧 DÉVELOPPEMENT', start: 11, end: 13 },
    { title: '🛠️  UTILITAIRES', start: 14, end: 15 },
  ];
  
  groups.forEach(group => {
    console.log(`${group.title}:`);
    menuOptions
      .filter(option => {
        const num = parseInt(option.key);
        return num >= group.start && num <= group.end;
      })
      .forEach(option => {
        console.log(`  ${option.key.padStart(2)}. ${option.description}`);
      });
    console.log('');
  });
  
  console.log('══════════════════════════════════════════════════════════');
  console.log('  q. 🚪 Quitter');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

function executeCommand(command: string): Promise<void> {
  return new Promise((resolve) => {
    console.log(`\n🔄 Exécution: ${command}`);
    console.log('─'.repeat(50));
    
    try {
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('─'.repeat(50));
      console.log('✅ Commande terminée');
    } catch (error) {
      console.log('─'.repeat(50));
      console.log('❌ Erreur lors de l\'exécution');
      console.error(error);
    }
    
    console.log('\n📝 Appuyez sur Entrée pour continuer...');
    rl.question('', () => {
      resolve();
    });
  });
}

async function promptUser(): Promise<void> {
  return new Promise((resolve) => {
    rl.question('👉 Choisissez une option: ', async (answer) => {
      const trimmed = answer.trim().toLowerCase();
      
      if (trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit') {
        console.log('\n👋 Au revoir !');
        rl.close();
        process.exit(0);
      }
      
      const option = menuOptions.find(opt => opt.key === trimmed);
      
      if (option) {
        await executeCommand(option.command);
        resolve();
      } else {
        console.log('\n❌ Option invalide. Essayez encore.');
        setTimeout(() => resolve(), 1000);
      }
    });
  });
}

async function main() {
  console.log('🎯 Bienvenue dans Files Core CLI!');
  console.log('💡 Tip: Vous pouvez quitter à tout moment avec "q"');
  
  while (true) {
    displayMenu();
    await promptUser();
  }
}

// Point d'entrée
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Erreur fatale du menu:', error);
    rl.close();
    process.exit(1);
  });
}
