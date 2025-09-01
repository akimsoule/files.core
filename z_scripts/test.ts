#!/usr/bin/env ts-node

/**
 * Script de tests fonctionnels pour tous les services Files Core
 * Ce script teste directement les services sans passer par les commandes CLI
 * 
 * Configuration MEGA:
 * Pour tester avec MEGA, définissez les variables d'environnement :
 *   export MEGA_EMAIL="votre-email@example.com"
 *   export MEGA_PASSWORD="votre-mot-de-passe-mega"
 * 
 * Ou modifiez la configuration dans ce fichier (CONFIG.MEGA_EMAIL / CONFIG.MEGA_PASSWORD)
 * 
 * Options d'exécution:
 *   - Tests complets avec MEGA : npx ts-node z_scripts/test.ts
 *   - Tests sans MEGA : MEGA_SKIP=true npx ts-node z_scripts/test.ts
 *   - Mode strict (arrêt sur échec MEGA) : STRICT_MODE=true npx ts-node z_scripts/test.ts
 *   - Sans nettoyage DB : SKIP_CLEAR=true npx ts-node z_scripts/test.ts
 */

import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../src/services/userService';
import { DocumentService } from '../src/services/documentService';
import { LogService } from '../src/services/logService';
import { MegaStorageService } from '../src/services/megaStorage';
import { FolderService } from '../src/services/folderService';
import { UserMegaConfigService } from '../src/services/userMegaConfigService';

// Initialisation des services
const prisma = new PrismaClient();
const logService = new LogService();
const userService = new UserService(logService);
const megaStorageService = new MegaStorageService();
const documentService = new DocumentService(megaStorageService, logService);
const folderService = new FolderService(logService);
const userMegaConfigService = new UserMegaConfigService();

// Configuration du script
const CONFIG = {
  // Si true, vide toutes les tables avant d'exécuter les tests
  CLEAR_DATABASE: process.env.SKIP_CLEAR !== 'true',
  // Si true, ignore complètement les tests MEGA
  SKIP_MEGA_TESTS: process.env.MEGA_SKIP === 'false',
  // Si true, continue même si des tests MEGA échouent
  CONTINUE_ON_MEGA_FAILURE: process.env.STRICT_MODE !== 'true',
  // Configuration MEGA pour les tests
  MEGA_EMAIL: process.env.MEGA_EMAIL || 'test@example.com', // À remplacer par une vraie adresse
  MEGA_PASSWORD: process.env.MEGA_PASSWORD || 'testpassword', // À remplacer par un vrai mot de passe
};

// Données de test (équivalent aux templates)
const TEST_DATA = {
  user: {
    email: "document.owner@example.com",
    name: "Document Owner", 
    password: "password123",
    updatedName: "Updated Document Owner"
  },
  document: {
    name: "Test Document",
    type: "txt",
    category: "test",
    description: "This is a test document.",
    tags: "test,cli",
    filePath: "./z_scripts/test.txt",
    updatedName: "Updated Test Document"
  },
  folder: {
    name: "Test Folder",
    description: "This is a test folder",
    color: "#FF5733",
    updatedName: "Updated Test Folder",
    updatedColor: "#33FF57"
  },
  megaConfig: {
    email: "test-mega@example.com",
    password: "mega-test-password-123",
    updatedEmail: "updated-mega@example.com"
  }
};

// Interface pour les tests fonctionnels
interface FunctionalTest {
  name: string;
  description: string;
  testFunction: () => Promise<any>;
  canFail?: boolean; // Si true, l'échec de ce test n'arrête pas le script
  isMegaRelated?: boolean; // Si true, ce test utilise MEGA et peut être lent
}

// Variables pour stocker les données de test créées
let createdUserId: string;
let createdDocumentId: string;
let createdFolderId: string;
let createdSubFolderId: string;
let testFolderId: string; // ID du dossier de test sur MEGA

// Configuration des tests fonctionnels à exécuter
const functionalTests: FunctionalTest[] = [
  // === PHASE 0: PRÉPARATION ===
  {
    name: 'mega-folder-setup',
    description: '📁 Création du dossier de test sur MEGA',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      const timestamp = Date.now();
      const folderName = `files-core-tests-${timestamp}`;
      testFolderId = await megaStorageService.createFolder(folderName);
      console.log(`📁 Dossier de test créé: ${folderName} (ID: ${testFolderId})`);
      return { folderId: testFolderId, folderName };
    }
  },

  // === PHASE 1: CRÉATION ET LECTURE ===
  {
    name: 'user-create',
    description: '👤 Création d\'un utilisateur via UserService',
    canFail: !CONFIG.CLEAR_DATABASE,
    testFunction: async () => {
      const user = await userService.createUser(TEST_DATA.user);
      createdUserId = user.id;
      return user;
    }
  },
  {
    name: 'user-read',
    description: '🔍 Lecture d\'un utilisateur via UserService',
    canFail: false,
    testFunction: async () => {
      return await userService.getUserById(createdUserId);
    }
  },
  {
    name: 'user-list',
    description: '📋 Liste des utilisateurs via UserService',
    canFail: false,
    testFunction: async () => {
      return await userService.getAllUsers();
    }
  },
  {
    name: 'document-create',
    description: '📄 Création d\'un document via DocumentService',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      const documentData: any = {
        ...TEST_DATA.document,
        ownerId: createdUserId,
        ownerEmail: TEST_DATA.user.email
      };
      
      // Lire le fichier test
      if (fs.existsSync(TEST_DATA.document.filePath)) {
        const fileBuffer = fs.readFileSync(TEST_DATA.document.filePath);
        documentData.file = {
          name: path.basename(TEST_DATA.document.filePath),
          buffer: fileBuffer,
          mimeType: 'text/plain'
        };
      }
      
      // Utiliser le dossier de test pour l'upload
      if (testFolderId) {
        documentData.testFolderId = testFolderId;
      }
      
      const document = await documentService.createDocument(documentData);
      createdDocumentId = document.id;
      return document;
    }
  },
  {
    name: 'document-list',
    description: '📋 Liste des documents via DocumentService',
    canFail: false,
    testFunction: async () => {
      return await documentService.getAllDocuments();
    }
  },

  // === PHASE 2: MODIFICATIONS ===
  {
    name: 'user-update',
    description: '✏️ Mise à jour d\'un utilisateur via UserService',
    canFail: false,
    testFunction: async () => {
      return await userService.updateUser(createdUserId, {
        name: TEST_DATA.user.updatedName
      });
    }
  },
  {
    name: 'user-verify',
    description: '✅ Vérification d\'un utilisateur via UserService',
    canFail: false,
    testFunction: async () => {
      return await userService.verifyPassword(TEST_DATA.user.email, TEST_DATA.user.password);
    }
  },
  {
    name: 'document-read',
    description: '🔍 Lecture d\'un document via DocumentService',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      if (!createdDocumentId) {
        throw new Error('Aucun document créé pour la lecture');
      }
      return await documentService.getDocumentById(createdDocumentId);
    }
  },
  {
    name: 'document-update',
    description: '✏️ Mise à jour d\'un document via DocumentService',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      if (!createdDocumentId) {
        throw new Error('Aucun document créé pour la mise à jour');
      }
      return await documentService.updateDocument(createdDocumentId, {
        name: TEST_DATA.document.updatedName,
        description: 'Document mis à jour par les tests'
      }, createdUserId);
    }
  },

  // === PHASE 3: CONSULTATION DES LOGS ===
  {
    name: 'log-list',
    description: '📋 Liste des logs via LogService',
    canFail: false,
    testFunction: async () => {
      return await logService.getAllLogs();
    }
  },
  {
    name: 'log-search',
    description: '🔍 Recherche dans les logs via LogService',
    canFail: false,
    testFunction: async () => {
      return await logService.getLogsByAction('USER_CREATE');
    }
  },
  {
    name: 'log-stats',
    description: '📊 Statistiques des logs via LogService',
    canFail: false,
    testFunction: async () => {
      return await logService.getUserLogsByEmail(TEST_DATA.user.email);
    }
  },

  // === PHASE 3.5: TESTS DES DOSSIERS ===
  {
    name: 'folder-create',
    description: '📁 Création d\'un dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      const folder = await folderService.createFolder({
        name: TEST_DATA.folder.name,
        description: TEST_DATA.folder.description,
        color: TEST_DATA.folder.color,
        ownerId: createdUserId,
      });
      createdFolderId = folder.id;
      return folder;
    }
  },
  {
    name: 'folder-read',
    description: '🔍 Lecture d\'un dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      if (!createdFolderId) {
        throw new Error('Aucun dossier créé pour la lecture');
      }
      return await folderService.getFolderById(createdFolderId, createdUserId);
    }
  },
  {
    name: 'folder-list',
    description: '📋 Liste des dossiers racine via FolderService',
    canFail: false,
    testFunction: async () => {
      return await folderService.getRootFolders(createdUserId);
    }
  },
  {
    name: 'folder-create-subfolder',
    description: '📁 Création d\'un sous-dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      if (!createdFolderId) {
        throw new Error('Aucun dossier parent créé');
      }
      const subFolder = await folderService.createFolder({
        name: "Sub " + TEST_DATA.folder.name,
        description: "Sous-dossier de test",
        color: "#9933FF",
        ownerId: createdUserId,
        parentId: createdFolderId,
      });
      createdSubFolderId = subFolder.id;
      return subFolder;
    }
  },
  {
    name: 'folder-update',
    description: '✏️ Mise à jour d\'un dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      if (!createdFolderId) {
        throw new Error('Aucun dossier créé pour la mise à jour');
      }
      return await folderService.updateFolder(createdFolderId, {
        name: TEST_DATA.folder.updatedName,
        color: TEST_DATA.folder.updatedColor,
      }, createdUserId);
    }
  },
  {
    name: 'document-move-to-folder',
    description: '📂 Déplacement de documents vers un dossier',
    canFail: false,
    testFunction: async () => {
      if (!createdDocumentId || !createdFolderId) {
        throw new Error('Document ou dossier manquant pour le déplacement');
      }
      return await folderService.moveDocumentToFolder(createdDocumentId, createdFolderId, createdUserId);
    }
  },

  // === PHASE 3.6: TESTS DE CONFIGURATION MEGA ===
  {
    name: 'mega-config-create',
    description: '🔧 Création d\'une configuration MEGA via UserMegaConfigService',
    canFail: false,
    testFunction: async () => {
      return await userMegaConfigService.upsertUserMegaConfig(createdUserId, {
        email: TEST_DATA.megaConfig.email,
        password: TEST_DATA.megaConfig.password,
        isActive: true,
      });
    }
  },
  {
    name: 'mega-config-read',
    description: '🔍 Lecture d\'une configuration MEGA via UserMegaConfigService',
    canFail: false,
    testFunction: async () => {
      return await userMegaConfigService.getUserMegaConfig(createdUserId);
    }
  },
  {
    name: 'mega-config-update',
    description: '✏️ Mise à jour d\'une configuration MEGA via UserMegaConfigService',
    canFail: false,
    testFunction: async () => {
      return await userMegaConfigService.upsertUserMegaConfig(createdUserId, {
        email: TEST_DATA.megaConfig.updatedEmail,
        password: TEST_DATA.megaConfig.password,
        isActive: true,
      });
    }
  },
  {
    name: 'mega-config-toggle',
    description: '🔄 Activation/désactivation d\'une configuration MEGA',
    canFail: false,
    testFunction: async () => {
      return await userMegaConfigService.toggleUserMegaConfig(createdUserId, false);
    }
  },
  {
    name: 'document-toggle-favorite',
    description: '⭐ Bascule du statut favori d\'un document',
    canFail: false,
    testFunction: async () => {
      if (!createdDocumentId) {
        throw new Error('Aucun document créé pour basculer le favori');
      }
      return await documentService.toggleFavorite(createdDocumentId, createdUserId);
    }
  },

  // === PHASE 4: SYNCHRONISATION ET SUPPRESSION ===
  {
    name: 'document-sync',
    description: '🔄 Synchronisation des fichiers MEGA vers la DB',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      // Pour ce test, nous allons d'abord supprimer le document de la DB
      // pour simuler un fichier existant sur MEGA mais pas en local.
      if (createdDocumentId) {
        // On supprime aussi les logs associés pour éviter les soucis de contraintes
        await prisma.log.deleteMany({ where: { documentId: createdDocumentId } });
        await prisma.document.delete({ where: { id: createdDocumentId } });
      }
      
      // Utiliser le dossier de test pour la synchronisation
      const syncResult = await documentService.synchronizeMegaFiles(createdUserId, testFolderId);
      
      if (syncResult.syncedCount === 0) {
        throw new Error("La synchronisation n'a trouvé aucun nouveau document à ajouter.");
      }
      if (syncResult.syncedCount > 1) {
        console.warn(`Attention: La synchronisation a ajouté ${syncResult.syncedCount} documents. Le test n'en attendait qu'un.`);
      }
      
      // Mettre à jour l'ID du document pour les tests suivants
      if (syncResult.newDocuments && syncResult.newDocuments.length > 0) {
        createdDocumentId = (syncResult.newDocuments[0] as any).id;
      }
      
      return syncResult;
    }
  },
  {
    name: 'document-delete',
    description: '🗑️ Suppression d\'un document via DocumentService',
    canFail: true,
    isMegaRelated: true,
    testFunction: async () => {
      if (!createdDocumentId) {
        throw new Error('Aucun document créé pour la suppression');
      }
      return await documentService.deleteDocument(createdDocumentId, createdUserId, testFolderId);
    }
  },
  {
    name: 'folder-delete-subfolder',
    description: '🗑️ Suppression d\'un sous-dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      if (!createdSubFolderId) {
        throw new Error('Aucun sous-dossier créé pour la suppression');
      }
      return await folderService.deleteFolder(createdSubFolderId, createdUserId);
    }
  },
  {
    name: 'folder-delete',
    description: '🗑️ Suppression d\'un dossier via FolderService',
    canFail: false,
    testFunction: async () => {
      if (!createdFolderId) {
        throw new Error('Aucun dossier créé pour la suppression');
      }
      return await folderService.deleteFolder(createdFolderId, createdUserId);
    }
  },
  {
    name: 'mega-config-delete',
    description: '🗑️ Suppression d\'une configuration MEGA via UserMegaConfigService',
    canFail: false,
    testFunction: async () => {
      return await userMegaConfigService.deleteUserMegaConfig(createdUserId);
    }
  },
  {
    name: 'user-delete',
    description: '🗑️ Suppression d\'un utilisateur via UserService',
    canFail: false,
    testFunction: async () => {
      return await userService.deleteUser(createdUserId);
    }
  }
];

// Résultats des tests
interface TestResult {
  name: string;
  description: string;
  success: boolean;
  duration: number;
  error?: string;
  result?: any;
}

// Fonction pour exécuter un test fonctionnel
async function executeTest(test: FunctionalTest): Promise<TestResult> {
  const startTime = Date.now();
  
  console.log(`\n🔄 Exécution: ${test.description}`);
  
  try {
    const result = await test.testFunction();
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Succès (${duration}ms)`);
    
    return {
      name: test.name,
      description: test.description,
      success: true,
      duration,
      result
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const emoji = test.canFail ? '⚠️ ' : '❌';
    console.log(`   ${emoji} Échec (${duration}ms): ${errorMessage}`);
    
    if (test.isMegaRelated) {
      console.log(`   💡 Note: Test MEGA - Vérifier la configuration MEGA si nécessaire`);
    }
    
    return {
      name: test.name,
      description: test.description,
      success: false,
      duration,
      error: errorMessage
    };
  }
}

// Fonction pour vider toutes les tables
async function clearAllTables(): Promise<void> {
  if (!CONFIG.CLEAR_DATABASE) {
    console.log('⏭️  Nettoyage de la base de données désactivé (SKIP_CLEAR=true)');
    return;
  }
  
  try {
    console.log('🧹 Nettoyage de la base de données...');
    
    // Compter d'abord les enregistrements existants
    const [logCount, documentCount, folderCount, megaConfigCount, userCount] = await Promise.all([
      prisma.log.count(),
      prisma.document.count(), 
      prisma.folder.count(),
      prisma.userMegaConfig.count(),
      prisma.user.count()
    ]);
    
    console.log(`   📊 État actuel: ${userCount} utilisateurs, ${documentCount} documents, ${folderCount} dossiers, ${megaConfigCount} configs MEGA, ${logCount} logs`);
    
    if (logCount + documentCount + userCount === 0) {
      console.log('✅ Base de données déjà vide');
      return;
    }
    
    // Ordre de suppression respectant les contraintes de clés étrangères
    // 1. Supprimer les logs (qui référencent users, documents et folders)
    const deletedLogs = await prisma.log.deleteMany({});
    console.log(`   📊 ${deletedLogs.count} logs supprimés`);
    
    // 2. Supprimer les documents (qui référencent users et folders)
    const deletedDocuments = await prisma.document.deleteMany({});
    console.log(`   📄 ${deletedDocuments.count} documents supprimés`);
    
    // 3. Supprimer les dossiers (qui référencent users)
    const deletedFolders = await prisma.folder.deleteMany({});
    console.log(`   📁 ${deletedFolders.count} dossiers supprimés`);
    
    // 4. Supprimer les configurations MEGA (qui référencent users)
    const deletedMegaConfigs = await prisma.userMegaConfig.deleteMany({});
    console.log(`   🔧 ${deletedMegaConfigs.count} configurations MEGA supprimées`);
    
    // 5. Supprimer les utilisateurs
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   👤 ${deletedUsers.count} utilisateurs supprimés`);
    
    console.log('✅ Base de données nettoyée avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la base de données:', error);
    throw error;
  }
}

// Fonction pour vérifier la connectivité de la base de données
async function checkDatabaseConnection(): Promise<void> {
  try {
    console.log('🔍 Vérification de la connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:', error);
    throw error;
  }
}

// Fonction pour vérifier et configurer MEGA
async function checkMegaConfiguration(): Promise<void> {
  if (CONFIG.SKIP_MEGA_TESTS) {
    console.log('⏭️  Tests MEGA ignorés - Pas de vérification MEGA nécessaire');
    return;
  }

  try {
    console.log('🔍 Vérification de la configuration MEGA...');
    
    // Vérifier si les variables d'environnement MEGA sont définies
    if (!process.env.MEGA_EMAIL && !CONFIG.MEGA_EMAIL) {
      console.warn('⚠️  MEGA_EMAIL non défini dans l\'environnement');
    }
    
    if (!process.env.MEGA_PASSWORD && !CONFIG.MEGA_PASSWORD) {
      console.warn('⚠️  MEGA_PASSWORD non défini dans l\'environnement');
    }

    // Configurer les variables d'environnement pour les services si elles ne sont pas définies
    if (!process.env.MEGA_EMAIL) {
      process.env.MEGA_EMAIL = CONFIG.MEGA_EMAIL;
      console.log('🔧 MEGA_EMAIL configuré depuis CONFIG');
    }
    
    if (!process.env.MEGA_PASSWORD) {
      process.env.MEGA_PASSWORD = CONFIG.MEGA_PASSWORD;
      console.log('🔧 MEGA_PASSWORD configuré depuis CONFIG');
    }

    // Test de connexion MEGA (optionnel, car peut être lent)
    console.log('💡 Note: Connexion MEGA sera testée lors du premier test de document');
    console.log('✅ Configuration MEGA prête');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification MEGA:', error);
    if (!CONFIG.CONTINUE_ON_MEGA_FAILURE) {
      throw error;
    }
    console.warn('⚠️  Continuant avec une configuration MEGA potentiellement défaillante');
  }
}

// Fonction principale
async function runAllFunctionalTests(): Promise<void> {
  // Filtrer les tests selon la configuration
  const testsToRun = CONFIG.SKIP_MEGA_TESTS 
    ? functionalTests.filter(test => !test.isMegaRelated)
    : functionalTests;
    
  console.log('🚀 Démarrage des tests fonctionnels Files Core');
  console.log(`📊 ${testsToRun.length}/${functionalTests.length} tests à exécuter`);
  
  if (CONFIG.SKIP_MEGA_TESTS) {
    const skippedTests = functionalTests.filter(test => test.isMegaRelated);
    console.log(`🚫 Tests MEGA ignorés: ${skippedTests.map(test => test.name).join(', ')}`);
  }
  
  console.log(`⚙️  Configuration: Nettoyage DB=${CONFIG.CLEAR_DATABASE}`);
  console.log(`🔧 Mode MEGA: ${CONFIG.SKIP_MEGA_TESTS ? 'Ignoré' : CONFIG.CONTINUE_ON_MEGA_FAILURE ? 'Tolérant aux échecs' : 'Strict'}`);
  
  if (CONFIG.SKIP_MEGA_TESTS) {
    console.log(`💡 Mode utilisateurs seulement - Tests rapides sans stockage MEGA`);
  }
  
  console.log();
  
  try {
    // 1. Vérification de la connexion à la base de données
    await checkDatabaseConnection();
    
    // 2. Vérification et configuration MEGA
    await checkMegaConfiguration();
    
    // 3. Nettoyage de la base de données
    await clearAllTables();
    
    console.log('\n🎯 Début de l\'exécution des tests fonctionnels...\n');
    
  } catch (error) {
    console.error('💥 Erreur lors de l\'initialisation:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  const results: TestResult[] = [];
  let criticalFailures = 0;
  
  // Exécution séquentielle des tests
  for (const test of testsToRun) {
    const result = await executeTest(test);
    results.push(result);
    
    // Arrêt en cas d'échec critique
    if (!result.success && !test.canFail) {
      criticalFailures++;
      console.log(`\n💥 Échec critique détecté - Arrêt des tests`);
      break;
    }
    
    // En mode strict, arrêt aussi sur les échecs MEGA
    if (!result.success && test.isMegaRelated && !CONFIG.CONTINUE_ON_MEGA_FAILURE) {
      criticalFailures++;
      console.log(`\n💥 Échec MEGA en mode strict détecté - Arrêt des tests`);
      console.log(`💡 Conseil: Utiliser le mode normal pour tolérer les échecs MEGA`);
      break;
    }
    
    // Petite pause entre les tests pour éviter les conflits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Rapport final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT FINAL DES TESTS FONCTIONNELS');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const megaFailures = results.filter(r => !r.success && functionalTests.find(c => c.name === r.name)?.isMegaRelated).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n📈 Statistiques globales:`);
  console.log(`   • Total exécuté: ${results.length}/${testsToRun.length} tests`);
  if (CONFIG.SKIP_MEGA_TESTS) {
    console.log(`   • Tests MEGA ignorés: ${functionalTests.length - testsToRun.length} 🚫`);
  }
  console.log(`   • Succès: ${successful} ✅`);
  console.log(`   • Échecs: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`   • Échecs MEGA: ${megaFailures} ${megaFailures > 0 ? '🐌' : ''}`);
  console.log(`   • Échecs critiques: ${criticalFailures} ${criticalFailures > 0 ? '💥' : ''}`);
  console.log(`   • Durée totale: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  
  // Tableau détaillé des résultats
  console.log(`\n📋 Détail des résultats:`);
  console.table(results.map(r => ({
    Nom: r.name,
    Description: r.description.substring(0, 40) + (r.description.length > 40 ? '...' : ''),
    Statut: r.success ? '✅ Succès' : '❌ Échec',
    'Durée (ms)': r.duration,
    Erreur: r.error ? r.error.substring(0, 50) + (r.error.length > 50 ? '...' : '') : ''
  })));
  
  // Échecs détaillés
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n❌ Détail des échecs (${failures.length}):`);
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.name} - ${failure.description}`);
      console.log(`   Erreur: ${failure.error}`);
    });
  }
  
  // Conclusion
  if (criticalFailures > 0) {
    console.log(`\n💥 Tests interrompus après ${criticalFailures} échec(s) critique(s)`);
    process.exit(1);
  } else if (failed > 0) {
    if (megaFailures === failed) {
      console.log(`\n🐌 Tests terminés avec ${failed} échec(s) MEGA seulement - Configuration à vérifier`);
      console.log(`💡 Conseil: Vérifier les variables d'environnement MEGA ou utiliser STRICT_MODE=false`);
    } else {
      console.log(`\n⚠️ Tests terminés avec ${failed} échec(s) non-critique(s)`);
    }
    process.exit(0);
  } else {
    console.log(`\n🎉 Tous les tests fonctionnels ont réussi!`);
    process.exit(0);
  }
  
  // Fermeture de la connexion Prisma
  await prisma.$disconnect();
}

// Point d'entrée
if (require.main === module) {
  runAllFunctionalTests().catch(async (error) => {
    console.error('💥 Erreur fatale des tests:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}