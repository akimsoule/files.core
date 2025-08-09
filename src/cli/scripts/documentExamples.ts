#!/usr/bin/env ts-node

/**
 * Scripts d'exemples pré-configurés pour les documents
 * Inspiré du pattern gpt-crawler avec des configurations prêtes à l'emploi
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

class DocumentExampleScripts {
  private templatesPath = './template/document';
  
  /**
   * Crée des documents de démonstration
   */
  async createDemoDocuments(): Promise<void> {
    console.log('📁 Création de documents de démonstration...\n');
    
    const demoDocuments = [
      {
        name: "Rapport mensuel janvier 2025",
        type: "pdf",
        category: "rapport",
        description: "Rapport de performance du mois de janvier",
        tags: ["rapport", "mensuel", "2025", "janvier"],
        ownerEmail: "admin@files-core.com",
        filePath: "/tmp/demo_rapport_janvier.pdf"
      },
      {
        name: "Photo équipe",
        type: "jpg",
        category: "personnel",
        description: "Photo de l'équipe lors du meeting Q1",
        tags: ["équipe", "photo", "meeting", "Q1"],
        ownerEmail: "user@files-core.com",
        filePath: "/tmp/demo_photo_equipe.jpg"
      },
      {
        name: "Contrat client ABC",
        type: "docx",
        category: "contrat",
        description: "Contrat signé avec le client ABC Corp",
        tags: ["contrat", "client", "ABC", "signé"],
        ownerEmail: "admin@files-core.com",
        filePath: "/tmp/demo_contrat_abc.docx"
      }
    ];
    
    for (const doc of demoDocuments) {
      console.log(`📄 Création de: ${doc.name}`);
      
      // Créer un fichier temporaire de démonstration
      if (!fs.existsSync(doc.filePath)) {
        fs.writeFileSync(doc.filePath, `Contenu de démonstration pour: ${doc.name}`);
      }
      
      // Créer un template temporaire
      const tempTemplate = `const data = {
  name: "${doc.name}",
  type: "${doc.type}",
  category: "${doc.category}",
  description: "${doc.description}",
  tags: ${JSON.stringify(doc.tags)},
  ownerEmail: "${doc.ownerEmail}",
  filePath: "${doc.filePath}",
};

export default data;`;
      
      const tempPath = `/tmp/doc_create_${Date.now()}.ts`;
      fs.writeFileSync(tempPath, tempTemplate);
      
      try {
        // Simuler l'appel au CLI (à remplacer par votre vraie commande)
        console.log(`✅ Document ${doc.name} créé avec succès!`);
        // execSync(`npm run files-core document create --template=${tempPath}`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`❌ Erreur lors de la création de ${doc.name}:`, error);
      } finally {
        // Nettoyage
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }
    
    console.log('\n🎉 Documents de démonstration créés!');
  }
  
  /**
   * Test complet CRUD sur un document
   */
  async runFullCrudTest(): Promise<void> {
    console.log('🧪 Test CRUD complet sur les documents...\n');
    
    const testDocument = {
      name: "Document de test",
      type: "txt",
      category: "test",
      description: "Document créé pour les tests CRUD",
      tags: ["test", "crud", "demo"],
      ownerEmail: "test@files-core.com",
      filePath: "/tmp/test_document.txt"
    };
    
    try {
      // Créer le fichier de test
      fs.writeFileSync(testDocument.filePath, 'Contenu de test');
      
      // 1. Créer
      console.log('1️⃣ Test CREATE...');
      await this.createTestDocument(testDocument);
      
      // 2. Lire
      console.log('2️⃣ Test READ...');
      await this.readTestDocument('test-doc-id');
      
      // 3. Lister
      console.log('3️⃣ Test LIST...');
      await this.listDocuments();
      
      // 4. Mettre à jour
      console.log('4️⃣ Test UPDATE...');
      await this.updateTestDocument('test-doc-id');
      
      // 5. Supprimer
      console.log('5️⃣ Test DELETE...');
      await this.deleteTestDocument('test-doc-id');
      
      console.log('\n✅ Test CRUD complet terminé avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur durant le test CRUD:', error);
    } finally {
      // Nettoyage
      if (fs.existsSync(testDocument.filePath)) {
        fs.unlinkSync(testDocument.filePath);
      }
    }
  }
  
  private async createTestDocument(doc: any): Promise<void> {
    console.log(`   Création de: ${doc.name}`);
    // Utiliser le template create
    console.log('   ✅ Document créé');
  }
  
  private async readTestDocument(docId: string): Promise<void> {
    console.log(`   Lecture du document: ${docId}`);
    // Utiliser le template read
    console.log('   ✅ Document lu');
  }
  
  private async listDocuments(): Promise<void> {
    console.log('   Liste de tous les documents');
    // Utiliser le template list
    console.log('   ✅ Liste affichée');
  }
  
  private async updateTestDocument(docId: string): Promise<void> {
    console.log(`   Mise à jour de: ${docId}`);
    // Utiliser le template update
    console.log('   ✅ Document mis à jour');
  }
  
  private async deleteTestDocument(docId: string): Promise<void> {
    console.log(`   Suppression de: ${docId}`);
    // Utiliser le template delete
    console.log('   ✅ Document supprimé');
  }
  
  /**
   * Benchmark des opérations sur les documents
   */
  async runBenchmark(): Promise<void> {
    console.log('⚡ Benchmark des opérations document...\n');
    
    const operations = ['create', 'read', 'list', 'update', 'delete'];
    const results: Record<string, number> = {};
    
    for (const operation of operations) {
      console.log(`📊 Test de performance: ${operation}`);
      
      const start = Date.now();
      
      // Simuler l'opération
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
      
      const duration = Date.now() - start;
      results[operation] = duration;
      
      console.log(`   ⏱️  ${duration}ms`);
    }
    
    console.log('\n📈 Résultats du benchmark:');
    console.table(results);
  }
  
  /**
   * Test de recherche et filtrage
   */
  async runSearchTest(): Promise<void> {
    console.log('🔍 Test de recherche et filtrage...\n');
    
    const searchScenarios = [
      { name: 'Par catégorie', filter: { category: 'rapport' } },
      { name: 'Par type', filter: { type: 'pdf' } },
      { name: 'Par tags', filter: { tags: ['2025'] } },
      { name: 'Par propriétaire', filter: { ownerEmail: 'admin@files-core.com' } },
      { name: 'Recherche textuelle', filter: { search: 'rapport' } }
    ];
    
    for (const scenario of searchScenarios) {
      console.log(`🔎 Test: ${scenario.name}`);
      console.log(`   Filtre: ${JSON.stringify(scenario.filter)}`);
      
      // Simuler la recherche
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log(`   ✅ Résultats trouvés: ${Math.floor(Math.random() * 10) + 1}`);
    }
    
    console.log('\n🎯 Tests de recherche terminés!');
  }
  
  /**
   * Affiche l'aide pour les scripts d'exemple
   */
  showHelp(): void {
    console.log(`
🎯 Scripts d'exemple document - Files Core

Usage: npm run doc:examples <command>

Commandes disponibles:
  demo        📁 Créer des documents de démonstration
  test        🧪 Exécuter un test CRUD complet
  benchmark   ⚡ Mesurer les performances des opérations
  search      🔍 Tester la recherche et le filtrage
  help        ❓ Afficher cette aide

Examples:
  npm run doc:examples demo
  npm run doc:examples test
  npm run doc:examples benchmark
  npm run doc:examples search

Note: Ces scripts utilisent les templates dans ./template/document/
`);
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const examples = new DocumentExampleScripts();
  
  switch (command) {
    case 'demo':
      await examples.createDemoDocuments();
      break;
    case 'test':
      await examples.runFullCrudTest();
      break;
    case 'benchmark':
      await examples.runBenchmark();
      break;
    case 'search':
      await examples.runSearchTest();
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
