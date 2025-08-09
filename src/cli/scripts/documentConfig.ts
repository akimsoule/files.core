#!/usr/bin/env ts-node

/**
 * Configuration et validation pour les scripts document
 * Pattern inspiré de gpt-crawler
 */

import * as fs from 'fs';
import * as path from 'path';

interface DocumentConfig {
  templates: {
    basePath: string;
    operations: string[];
  };
  validation: {
    required: string[];
    optional: string[];
  };
  defaults: {
    pagination: {
      skip: number;
      take: number;
    };
    upload: {
      maxFileSize: number; // en MB
      allowedTypes: string[];
    };
  };
  storage: {
    megaCredentials: {
      required: boolean;
    };
    localPath: string;
  };
}

class DocumentConfigManager {
  private configPath = './files-core-config.json';
  private defaultDocumentConfig: DocumentConfig = {
    templates: {
      basePath: './template/document',
      operations: ['create', 'read', 'list', 'update', 'delete']
    },
    validation: {
      required: ['name', 'type', 'ownerEmail', 'filePath'],
      optional: ['id', 'category', 'description', 'tags', 'skip', 'take', 'force']
    },
    defaults: {
      pagination: {
        skip: 0,
        take: 10
      },
      upload: {
        maxFileSize: 100, // 100MB
        allowedTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar']
      }
    },
    storage: {
      megaCredentials: {
        required: true
      },
      localPath: './uploads'
    }
  };
  
  /**
   * Initialise la configuration document
   */
  async initConfig(): Promise<void> {
    console.log('🔧 Initialisation de la configuration document...\n');
    
    try {
      let config: any = {};
      
      // Charger la configuration existante ou créer la nouvelle
      if (fs.existsSync(this.configPath)) {
        console.log('📄 Fichier de configuration existant trouvé');
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        config = JSON.parse(configData);
      }
      
      // Ajouter la configuration document
      config.document = this.defaultDocumentConfig;
      
      // Sauvegarder
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('✅ Configuration document ajoutée');
      
      // Créer les dossiers de templates s'ils n'existent pas
      await this.ensureTemplateDirectories();
      
      // Créer le dossier d'upload local
      await this.ensureUploadDirectory();
      
      console.log('🎉 Configuration document initialisée avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }
  
  /**
   * Charge la configuration document depuis le fichier
   */
  loadConfig(): DocumentConfig {
    if (!fs.existsSync(this.configPath)) {
      throw new Error('Fichier de configuration non trouvé. Exécutez npm run doc:init');
    }
    
    const configData = fs.readFileSync(this.configPath, 'utf-8');
    const fullConfig = JSON.parse(configData);
    
    if (!fullConfig.document) {
      throw new Error('Configuration document non trouvée. Exécutez npm run doc:init');
    }
    
    return fullConfig.document;
  }
  
  /**
   * Valide la structure des templates document
   */
  async validateTemplates(): Promise<boolean> {
    console.log('🔍 Validation des templates document...\n');
    
    const config = this.loadConfig();
    let isValid = true;
    
    for (const operation of config.templates.operations) {
      const templatePath = path.join(config.templates.basePath, operation, 'index.ts');
      
      if (!fs.existsSync(templatePath)) {
        console.error(`❌ Template manquant: ${templatePath}`);
        isValid = false;
        continue;
      }
      
      // Valider le contenu du template
      try {
        const content = fs.readFileSync(templatePath, 'utf-8');
        
        if (!content.includes('const data = {') || !content.includes('export default data;')) {
          console.error(`❌ Format invalide dans: ${templatePath}`);
          isValid = false;
          continue;
        }
        
        // Validation spécifique selon l'opération
        const validationResult = this.validateTemplateContent(operation, content);
        if (!validationResult.isValid) {
          console.error(`❌ Validation échouée pour ${operation}: ${validationResult.error}`);
          isValid = false;
          continue;
        }
        
        console.log(`✅ Template valide: ${operation}`);
        
      } catch (error) {
        console.error(`❌ Erreur lecture template ${operation}:`, error);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log('\n🎉 Tous les templates document sont valides!');
    } else {
      console.log('\n❌ Validation échouée. Corrigez les erreurs ci-dessus.');
    }
    
    return isValid;
  }
  
  /**
   * Valide le contenu d'un template spécifique
   */
  private validateTemplateContent(operation: string, content: string): { isValid: boolean; error?: string } {
    switch (operation) {
      case 'create':
        if (!content.includes('name:') || !content.includes('type:') || !content.includes('ownerEmail:')) {
          return { isValid: false, error: 'Champs obligatoires manquants (name, type, ownerEmail)' };
        }
        break;
      case 'read':
        if (!content.includes('id:')) {
          return { isValid: false, error: 'Champ id obligatoire manquant' };
        }
        break;
      case 'update':
        if (!content.includes('id:')) {
          return { isValid: false, error: 'Champ id obligatoire manquant pour la mise à jour' };
        }
        break;
      case 'delete':
        if (!content.includes('id:')) {
          return { isValid: false, error: 'Champ id obligatoire manquant pour la suppression' };
        }
        break;
    }
    
    return { isValid: true };
  }
  
  /**
   * Assure que les dossiers de templates existent
   */
  private async ensureTemplateDirectories(): Promise<void> {
    const config = this.loadConfig();
    
    for (const operation of config.templates.operations) {
      const dirPath = path.join(config.templates.basePath, operation);
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Dossier créé: ${dirPath}`);
      }
    }
  }
  
  /**
   * Assure que le dossier d'upload existe
   */
  private async ensureUploadDirectory(): Promise<void> {
    const config = this.loadConfig();
    
    if (!fs.existsSync(config.storage.localPath)) {
      fs.mkdirSync(config.storage.localPath, { recursive: true });
      console.log(`📁 Dossier d'upload créé: ${config.storage.localPath}`);
    }
  }
  
  /**
   * Valide les données d'un template
   */
  validateTemplateData(operation: string, data: any): boolean {
    const config = this.loadConfig();
    
    // Validation basique selon l'opération
    switch (operation) {
      case 'create':
        return this.validateCreateData(data, config);
      case 'read':
        return this.validateReadData(data, config);
      case 'update':
        return this.validateUpdateData(data, config);
      case 'delete':
        return this.validateDeleteData(data, config);
      case 'list':
        return this.validateListData(data, config);
      default:
        return false;
    }
  }
  
  private validateCreateData(data: any, config: DocumentConfig): boolean {
    const required = ['name', 'type', 'ownerEmail', 'filePath'];
    const hasRequired = required.every(field => data[field] !== undefined);
    
    if (!hasRequired) return false;
    
    // Vérifier le type de fichier
    if (!config.defaults.upload.allowedTypes.includes(data.type.toLowerCase())) {
      console.warn(`⚠️ Type de fichier non autorisé: ${data.type}`);
    }
    
    return true;
  }
  
  private validateReadData(data: any, config: DocumentConfig): boolean {
    return data.id !== undefined;
  }
  
  private validateUpdateData(data: any, config: DocumentConfig): boolean {
    return data.id !== undefined && 
           (data.name !== undefined || data.description !== undefined || data.tags !== undefined);
  }
  
  private validateDeleteData(data: any, config: DocumentConfig): boolean {
    return data.id !== undefined;
  }
  
  private validateListData(data: any, config: DocumentConfig): boolean {
    // skip et take sont optionnels
    return true;
  }
  
  /**
   * Affiche la configuration document actuelle
   */
  showConfig(): void {
    try {
      const config = this.loadConfig();
      
      console.log('\n📋 Configuration document actuelle:\n');
      console.log(JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error('❌ Impossible de charger la configuration document:', error);
    }
  }
  
  /**
   * Vérifie l'environnement MEGA
   */
  async checkMegaEnvironment(): Promise<void> {
    console.log('🔍 Vérification de l\'environnement MEGA...\n');
    
    const requiredEnvVars = ['MEGA_EMAIL', 'MEGA_PASSWORD'];
    let allPresent = true;
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} configuré`);
      } else {
        console.error(`❌ ${envVar} manquant`);
        allPresent = false;
      }
    }
    
    if (allPresent) {
      console.log('\n🎉 Environnement MEGA correctement configuré!');
    } else {
      console.log('\n❌ Configuration MEGA incomplète. Vérifiez votre fichier .env');
    }
  }
  
  /**
   * Affiche l'aide
   */
  showHelp(): void {
    console.log(`
⚙️  Gestionnaire de configuration document - Files Core

Usage: npm run doc:config <command>

Commandes disponibles:
  init        🔧 Initialiser la configuration
  validate    🔍 Valider les templates
  show        📋 Afficher la configuration
  check-mega  🔍 Vérifier l'environnement MEGA
  help        ❓ Afficher cette aide

Examples:
  npm run doc:config init
  npm run doc:config validate
  npm run doc:config show
  npm run doc:config check-mega

Fichiers:
  Configuration: ./files-core-config.json
  Templates: ./template/document/
  Uploads: ./uploads/
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const configManager = new DocumentConfigManager();
  
  switch (command) {
    case 'init':
      await configManager.initConfig();
      break;
    case 'validate':
      await configManager.validateTemplates();
      break;
    case 'show':
      configManager.showConfig();
      break;
    case 'check-mega':
      await configManager.checkMegaEnvironment();
      break;
    case 'help':
    default:
      configManager.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DocumentConfigManager };
