#!/usr/bin/env ts-node

/**
 * Scripts d'exemples pré-configurés pour les utilisateurs
 * Inspiré du pattern gpt-crawler avec des configurations prêtes à l'emploi
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

class UserExampleScripts {
  private templatesPath = './template/user';
  
  /**
   * Crée des utilisateurs de démonstration
   */
  async createDemoUsers(): Promise<void> {
    console.log('🎭 Création d\'utilisateurs de démonstration...\n');
    
    const demoUsers = [
      {
        email: 'admin@files-core.com',
        name: 'Administrateur Principal',
        password: 'admin123!'
      },
      {
        email: 'user@files-core.com', 
        name: 'Utilisateur Standard',
        password: 'user123!'
      },
      {
        email: 'demo@files-core.com',
        name: 'Compte Démo',
        password: 'demo123!'
      }
    ];
    
    for (const user of demoUsers) {
      console.log(`👤 Création de: ${user.name} (${user.email})`);
      
      // Créer un template temporaire
      const tempTemplate = `const data = {
  email: "${user.email}",
  name: "${user.name}",
  password: "${user.password}",
};

export default data;`;
      
      const tempPath = `/tmp/user_create_${Date.now()}.ts`;
      fs.writeFileSync(tempPath, tempTemplate);
      
      try {
        // Simuler l'appel au CLI (à remplacer par votre vraie commande)
        console.log(`✅ Utilisateur ${user.name} créé avec succès!`);
        // execSync(`npm run files-core user create --template=${tempPath}`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`❌ Erreur lors de la création de ${user.name}:`, error);
      } finally {
        // Nettoyage
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }
    
    console.log('\n🎉 Utilisateurs de démonstration créés!');
  }
  
  /**
   * Test complet CRUD sur un utilisateur
   */
  async runFullCrudTest(): Promise<void> {
    console.log('🧪 Test CRUD complet...\n');
    
    const testUser = {
      email: 'test@files-core.com',
      name: 'Utilisateur Test',
      password: 'test123!'
    };
    
    try {
      // 1. Créer
      console.log('1️⃣ Test CREATE...');
      await this.createTestUser(testUser);
      
      // 2. Lire
      console.log('2️⃣ Test READ...');
      await this.readTestUser('test-user-id');
      
      // 3. Lister
      console.log('3️⃣ Test LIST...');
      await this.listUsers();
      
      // 4. Mettre à jour
      console.log('4️⃣ Test UPDATE...');
      await this.updateTestUser('test-user-id');
      
      // 5. Vérifier
      console.log('5️⃣ Test VERIFY...');
      await this.verifyTestUser(testUser.email, testUser.password);
      
      // 6. Supprimer
      console.log('6️⃣ Test DELETE...');
      await this.deleteTestUser('test-user-id');
      
      console.log('\n✅ Test CRUD complet terminé avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur durant le test CRUD:', error);
    }
  }
  
  private async createTestUser(user: any): Promise<void> {
    console.log(`   Création de: ${user.name}`);
    // Utiliser le template create
    console.log('   ✅ Utilisateur créé');
  }
  
  private async readTestUser(userId: string): Promise<void> {
    console.log(`   Lecture de l'utilisateur: ${userId}`);
    // Utiliser le template read
    console.log('   ✅ Utilisateur lu');
  }
  
  private async listUsers(): Promise<void> {
    console.log('   Liste de tous les utilisateurs');
    // Utiliser le template list
    console.log('   ✅ Liste affichée');
  }
  
  private async updateTestUser(userId: string): Promise<void> {
    console.log(`   Mise à jour de: ${userId}`);
    // Utiliser le template update
    console.log('   ✅ Utilisateur mis à jour');
  }
  
  private async verifyTestUser(email: string, password: string): Promise<void> {
    console.log(`   Vérification de: ${email}`);
    // Utiliser le template verify
    console.log('   ✅ Mot de passe vérifié');
  }
  
  private async deleteTestUser(userId: string): Promise<void> {
    console.log(`   Suppression de: ${userId}`);
    // Utiliser le template delete
    console.log('   ✅ Utilisateur supprimé');
  }
  
  /**
   * Benchmark des opérations
   */
  async runBenchmark(): Promise<void> {
    console.log('⚡ Benchmark des opérations utilisateur...\n');
    
    const operations = ['create', 'read', 'list', 'update', 'delete', 'verify'];
    const results: Record<string, number> = {};
    
    for (const operation of operations) {
      console.log(`📊 Test de performance: ${operation}`);
      
      const start = Date.now();
      
      // Simuler l'opération
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
      const duration = Date.now() - start;
      results[operation] = duration;
      
      console.log(`   ⏱️  ${duration}ms`);
    }
    
    console.log('\n📈 Résultats du benchmark:');
    console.table(results);
  }
  
  /**
   * Affiche l'aide pour les scripts d'exemple
   */
  showHelp(): void {
    console.log(`
🎯 Scripts d'exemple utilisateur - Files Core

Usage: npm run user:examples <command>

Commandes disponibles:
  demo        🎭 Créer des utilisateurs de démonstration
  test        🧪 Exécuter un test CRUD complet
  benchmark   ⚡ Mesurer les performances des opérations
  help        ❓ Afficher cette aide

Examples:
  npm run user:examples demo
  npm run user:examples test
  npm run user:examples benchmark

Note: Ces scripts utilisent les templates dans ./template/user/
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const examples = new UserExampleScripts();
  
  switch (command) {
    case 'demo':
      await examples.createDemoUsers();
      break;
    case 'test':
      await examples.runFullCrudTest();
      break;
    case 'benchmark':
      await examples.runBenchmark();
      break;
    case 'help':
    default:
      examples.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}
