#!/usr/bin/env ts-node

/**
 * Configuration et validation pour les scripts utilisateur
 * Pattern inspiré de gpt-crawler
 */

import * as fs from 'fs';
import * as path from 'path';

interface UserConfig {
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
    security: {
      minPasswordLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
    };
  };
}

class UserConfigManager {
  private configPath = './files-core-config.json';
  private defaultConfig: UserConfig = {
    templates: {
      basePath: './template/user',
      operations: ['create', 'read', 'list', 'update', 'delete', 'verify']
    },
    validation: {
      required: ['email', 'name', 'password'],
      optional: ['id', 'skip', 'take', 'force']
    },
    defaults: {
      pagination: {
        skip: 0,
        take: 10
      },
      security: {
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumbers: true
      }
    }
  };
  
  /**
   * Initialise la configuration utilisateur
   */
  async initConfig(): Promise<void> {
    console.log('🔧 Initialisation de la configuration utilisateur...\n');
    
    try {
      // Vérifier si le fichier de config existe
      if (fs.existsSync(this.configPath)) {
        console.log('📄 Fichier de configuration existant trouvé');
        const existingConfig = this.loadConfig();
        console.log('✅ Configuration chargée avec succès');
        return;
      }
      
      // Créer la configuration par défaut
      fs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
      console.log('✅ Configuration par défaut créée');
      
      // Créer les dossiers de templates s'ils n'existent pas
      await this.ensureTemplateDirectories();
      
      console.log('🎉 Configuration initialisée avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }
  
  /**
   * Charge la configuration depuis le fichier
   */
  loadConfig(): UserConfig {
    if (!fs.existsSync(this.configPath)) {
      throw new Error('Fichier de configuration non trouvé. Exécutez npm run user:init');
    }
    
    const configData = fs.readFileSync(this.configPath, 'utf-8');
    return JSON.parse(configData);
  }
  
  /**
   * Valide la structure des templates
   */
  async validateTemplates(): Promise<boolean> {
    console.log('🔍 Validation des templates utilisateur...\n');
    
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
        
        console.log(`✅ Template valide: ${operation}`);
        
      } catch (error) {
        console.error(`❌ Erreur lecture template ${operation}:`, error);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log('\n🎉 Tous les templates sont valides!');
    } else {
      console.log('\n❌ Validation échouée. Corrigez les erreurs ci-dessus.');
    }
    
    return isValid;
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
      case 'verify':
        return this.validateVerifyData(data, config);
      case 'list':
        return this.validateListData(data, config);
      default:
        return false;
    }
  }
  
  private validateCreateData(data: any, config: UserConfig): boolean {
    const required = ['email', 'name', 'password'];
    return required.every(field => data[field] !== undefined);
  }
  
  private validateReadData(data: any, config: UserConfig): boolean {
    return data.id !== undefined;
  }
  
  private validateUpdateData(data: any, config: UserConfig): boolean {
    return data.id !== undefined && 
           (data.name !== undefined || data.email !== undefined || data.password !== undefined);
  }
  
  private validateDeleteData(data: any, config: UserConfig): boolean {
    return data.id !== undefined;
  }
  
  private validateVerifyData(data: any, config: UserConfig): boolean {
    return data.email !== undefined && data.password !== undefined;
  }
  
  private validateListData(data: any, config: UserConfig): boolean {
    // skip et take sont optionnels
    return true;
  }
  
  /**
   * Affiche la configuration actuelle
   */
  showConfig(): void {
    try {
      const config = this.loadConfig();
      
      console.log('\n📋 Configuration utilisateur actuelle:\n');
      console.log(JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error('❌ Impossible de charger la configuration:', error);
    }
  }
  
  /**
   * Affiche l'aide
   */
  showHelp(): void {
    console.log(`
⚙️  Gestionnaire de configuration utilisateur - Files Core

Usage: npm run user:config <command>

Commandes disponibles:
  init        🔧 Initialiser la configuration
  validate    🔍 Valider les templates
  show        📋 Afficher la configuration
  help        ❓ Afficher cette aide

Examples:
  npm run user:config init
  npm run user:config validate
  npm run user:config show

Fichiers:
  Configuration: ./files-core-config.json
  Templates: ./template/user/
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const configManager = new UserConfigManager();
  
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
    case 'help':
    default:
      configManager.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { UserConfigManager };
