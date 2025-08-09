#!/usr/bin/env ts-node

/**
 * Script utilitaire pour les opérations CRUD utilisateur
 * Utilise les templates définis dans template/user/
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Types pour les opérations CRUD
type CrudOperation = 'create' | 'read' | 'list' | 'update' | 'delete' | 'verify';
type ScriptOperation = CrudOperation | 'help';

class UserCrudScript {
  private templateBasePath = './template/user';
  
  /**
   * Charge le template de données pour une opération donnée
   */
  private async loadTemplate(operation: CrudOperation): Promise<any> {
    const templatePath = path.join(this.templateBasePath, operation, 'index.ts');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template non trouvé: ${templatePath}`);
    }
    
    // Import dynamique du template
    const module = await import(path.resolve(templatePath));
    return module.default;
  }
  
  /**
   * Exécute une commande CLI avec les données du template
   */
  private executeCliCommand(operation: CrudOperation, data: any): void {
    console.log(`🔄 Exécution de l'opération: ${operation}`);
    console.log(`📄 Données utilisées:`, JSON.stringify(data, null, 2));
    
    try {
      // Construction de la commande avec les données du template
      let command = `npm run files-core -- user ${operation}`;
      
      // Ajouter les paramètres selon l'opération
      switch (operation) {
        case 'create':
          command += ` --email="${data.email}" --name="${data.name}" --password="${data.password}"`;
          break;
        case 'read':
          command += ` --id="${data.id}"`;
          break;
        case 'list':
          command += ` --skip=${data.skip || 0} --take=${data.take || 10}`;
          break;
        case 'update':
          command += ` --id="${data.id}"`;
          if (data.name) command += ` --name="${data.name}"`;
          if (data.email) command += ` --email="${data.email}"`;
          if (data.password) command += ` --password="${data.password}"`;
          break;
        case 'delete':
          command += ` --id="${data.id}"`;
          if (data.force) command += ` --force`;
          break;
        case 'verify':
          command += ` --email="${data.email}" --password="${data.password}"`;
          break;
      }
      
      console.log(`⚡ Commande: ${command}`);
      
      // Exécution de la commande CLI
      execSync(command, { stdio: 'inherit' });
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de ${operation}:`, error);
      process.exit(1);
    }
  }
  
  /**
   * Exécute une opération CRUD
   */
  async executeCrud(operation: CrudOperation): Promise<void> {
    try {
      console.log(`\n🚀 Démarrage de l'opération: ${operation.toUpperCase()}`);
      
      const templateData = await this.loadTemplate(operation);
      this.executeCliCommand(operation, templateData);
      
    } catch (error) {
      console.error(`❌ Erreur:`, error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
  
  /**
   * Affiche l'aide
   */
  showHelp(): void {
    console.log(`
📋 Script CRUD Utilisateur - Files Core

Usage: npm run user:script <operation>

Opérations disponibles:
  create   👤 Créer un nouvel utilisateur
  read     🔍 Lire un utilisateur par ID  
  list     📋 Lister tous les utilisateurs
  update   ✏️  Mettre à jour un utilisateur
  delete   🗑️  Supprimer un utilisateur
  verify   🔐 Vérifier un mot de passe
  help     ❓ Afficher cette aide

Examples:
  npm run user:script create
  npm run user:script list
  npm run user:script verify

Templates utilisés:
  ./template/user/<operation>/index.ts
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const operation = args[0] as ScriptOperation;
  
  const script = new UserCrudScript();
  
  if (!operation || operation === 'help') {
    script.showHelp();
    return;
  }
  
  const validOperations: CrudOperation[] = ['create', 'read', 'list', 'update', 'delete', 'verify'];
  
  if (!validOperations.includes(operation)) {
    console.error(`❌ Opération invalide: ${operation}`);
    console.error(`✅ Opérations valides: ${validOperations.join(', ')}`);
    process.exit(1);
  }
  
  await script.executeCrud(operation);
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non gérée:', reason);
  process.exit(1);
});

// Exécution
if (require.main === module) {
  main().catch(console.error);
}

export { UserCrudScript };
