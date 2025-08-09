#!/usr/bin/env ts-node

/**
 * Script utilitaire pour les opérations CRUD document
 * Utilise les templates définis dans template/document/
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Types pour les opérations CRUD
type CrudOperation = 'create' | 'read' | 'list' | 'update' | 'delete';

class DocumentCrudScript {
  private templateBasePath = './template/document';
  
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
      let command = `npm run files-core -- document ${operation}`;
      
      // Ajouter les paramètres selon l'opération
      switch (operation) {
        case 'create':
          command += ` --name="${data.name}" --type="${data.type}" --owner-email="${data.ownerEmail}"`;
          if (data.category) command += ` --category="${data.category}"`;
          if (data.description) command += ` --description="${data.description}"`;
          if (data.tags) command += ` --tags="${data.tags.join(',')}"`;
          if (data.filePath) command += ` --file-path="${data.filePath}"`;
          break;
        case 'read':
          command += ` --id="${data.id}"`;
          break;
        case 'list':
          command += ` --skip=${data.skip || 0} --take=${data.take || 10}`;
          break;
        case 'update':
          command += ` --id="${data.id}" --user-email="${data.userEmail}"`;
          if (data.name) command += ` --name="${data.name}"`;
          if (data.description) command += ` --description="${data.description}"`;
          if (data.tags) command += ` --tags="${data.tags.join(',')}"`;
          if (data.isFavorite !== undefined) {
            command += data.isFavorite ? ` --favorite` : ` --no-favorite`;
          }
          break;
        case 'delete':
          command += ` --id="${data.id}" --user-email="${data.userEmail}"`;
          if (data.force) command += ` --force`;
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
📋 Script CRUD Document - Files Core

Usage: npm run doc:script <operation>

Opérations disponibles:
  create   📄 Créer un nouveau document
  read     🔍 Lire un document par ID  
  list     📋 Lister tous les documents
  update   ✏️  Mettre à jour un document
  delete   🗑️  Supprimer un document
  help     ❓ Afficher cette aide

Examples:
  npm run doc:script create
  npm run doc:script list
  npm run doc:script update

Templates utilisés:
  ./template/document/<operation>/index.ts
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const operation = args[0] as CrudOperation | 'help';
  
  const script = new DocumentCrudScript();
  
  if (!operation || operation === 'help') {
    script.showHelp();
    return;
  }
  
  const validOperations: CrudOperation[] = ['create', 'read', 'list', 'update', 'delete'];
  
  if (!validOperations.includes(operation as CrudOperation)) {
    console.error(`❌ Opération invalide: ${operation}`);
    console.error(`✅ Opérations valides: ${validOperations.join(', ')}`);
    process.exit(1);
  }
  
  await script.executeCrud(operation as CrudOperation);
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

export { DocumentCrudScript };
