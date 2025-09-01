#!/usr/bin/env ts-node

/**
 * Script de données de test pour Files Core
 * Initialise la base de données avec des données d'exemple
 */

import { PrismaClient } from '@prisma/client';
import { UserService } from '../src/services/userService';
import { DocumentService } from '../src/services/documentService';
import { LogService } from '../src/services/logService';
import { MegaStorageService } from '../src/services/megaStorage';
import { FolderService } from '../src/services/folderService';
import { UserMegaConfigService } from '../src/services/userMegaConfigService';
import fs from 'fs';

const prisma = new PrismaClient();
const logService = new LogService();
const userService = new UserService(logService);
const megaStorageService = new MegaStorageService();
const documentService = new DocumentService(megaStorageService, logService);
const folderService = new FolderService(logService);
const userMegaConfigService = new UserMegaConfigService();

// Données de test
const SEED_DATA = {
  users: [
    {
      name: "Admin User",
      email: "admin@filescore.com",
      password: "admin123"
    },
    {
      name: "John Doe",
      email: "john.doe@example.com", 
      password: "password123"
    },
    {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      password: "password456"
    }
  ],
  folders: [
    {
      name: "Documents personnels",
      description: "Dossier pour les documents personnels",
      color: "#3B82F6"
    },
    {
      name: "Projets",
      description: "Dossier pour les projets de travail",
      color: "#10B981"
    },
    {
      name: "Archives",
      description: "Dossier pour les documents archivés",
      color: "#6B7280"
    }
  ],
  documents: [
    {
      name: "Guide utilisateur",
      type: "txt",
      description: "Guide d'utilisation de Files Core CLI",
      tags: "guide,documentation,aide"
    },
    {
      name: "Exemple de rapport",
      type: "txt", 
      description: "Exemple de document rapport",
      tags: "exemple,rapport,demo"
    },
    {
      name: "Notes de projet",
      type: "txt",
      description: "Notes importantes pour le projet",
      tags: "notes,projet,important"
    }
  ],
  megaConfigs: [
    {
      email: "admin.mega@example.com",
      password: "mega-password-123"
    }
  ]
};

async function clearDatabase(): Promise<void> {
  try {
    console.log('🧹 Nettoyage de la base de données...');
    
    // Compter les enregistrements existants
    const [logCount, documentCount, folderCount, megaConfigCount, userCount] = await Promise.all([
      prisma.log.count(),
      prisma.document.count(),
      prisma.folder.count(),
      prisma.userMegaConfig.count(),
      prisma.user.count()
    ]);
    
    if (logCount + documentCount + folderCount + megaConfigCount + userCount === 0) {
      console.log('✅ Base de données déjà vide');
      return;
    }
    
    console.log(`   📊 État actuel: ${userCount} utilisateurs, ${documentCount} documents, ${folderCount} dossiers, ${megaConfigCount} configs MEGA, ${logCount} logs`);
    
    // Supprimer dans l'ordre des contraintes
    await prisma.log.deleteMany({});
    console.log(`   📊 ${logCount} logs supprimés`);
    
    await prisma.document.deleteMany({});
    console.log(`   📄 ${documentCount} documents supprimés`);
    
    await prisma.folder.deleteMany({});
    console.log(`   📁 ${folderCount} dossiers supprimés`);
    
    await prisma.userMegaConfig.deleteMany({});
    console.log(`   🔧 ${megaConfigCount} configurations MEGA supprimées`);
    
    await prisma.user.deleteMany({});
    console.log(`   👤 ${userCount} utilisateurs supprimés`);
    
    console.log('✅ Base de données nettoyée');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
}

async function seedUsers(): Promise<string[]> {
  console.log('\n👤 Création des utilisateurs...');
  const userIds: string[] = [];
  
  for (const userData of SEED_DATA.users) {
    try {
      const user = await userService.createUser(userData);
      userIds.push(user.id);
      console.log(`   ✅ Utilisateur créé: ${user.name} (${user.email})`);
    } catch (error) {
      console.log(`   ⚠️  Utilisateur ${userData.email} existe déjà ou erreur:`, error);
    }
  }
  
  console.log(`✅ ${userIds.length} utilisateurs traités`);
  return userIds;
}

async function seedFolders(userIds: string[]): Promise<string[]> {
  console.log('\n📁 Création des dossiers...');
  const folderIds: string[] = [];
  
  if (userIds.length === 0) {
    console.log('⚠️  Aucun utilisateur disponible pour créer des dossiers');
    return folderIds;
  }
  
  for (let i = 0; i < SEED_DATA.folders.length; i++) {
    const folderData = SEED_DATA.folders[i];
    const ownerId = userIds[i % userIds.length]; // Répartir les dossiers entre les utilisateurs
    
    try {
      const folder = await folderService.createFolder({
        ...folderData,
        ownerId: ownerId
      });
      folderIds.push(folder.id);
      console.log(`   ✅ Dossier créé: ${folder.name} (propriétaire: ${ownerId.substring(0, 8)}...)`);
    } catch (error) {
      console.log(`   ⚠️  Erreur création dossier ${folderData.name}:`, error);
    }
  }
  
  console.log(`✅ ${folderIds.length} dossiers traités`);
  return folderIds;
}

async function seedMegaConfigs(userIds: string[]): Promise<void> {
  console.log('\n🔧 Création des configurations MEGA...');
  
  if (userIds.length === 0) {
    console.log('⚠️  Aucun utilisateur disponible pour créer des configurations MEGA');
    return;
  }
  
  // Ne créer une config MEGA que pour le premier utilisateur (admin)
  const adminUserId = userIds[0];
  const configData = SEED_DATA.megaConfigs[0];
  
  try {
    const config = await userMegaConfigService.upsertUserMegaConfig(adminUserId, {
      email: configData.email,
      password: configData.password,
      isActive: true
    });
    console.log(`   ✅ Configuration MEGA créée pour l'utilisateur admin`);
  } catch (error) {
    console.log(`   ⚠️  Erreur création configuration MEGA:`, error);
  }
  
  console.log('✅ Configurations MEGA traitées');
}

async function seedDocuments(userIds: string[], folderIds: string[]): Promise<void> {
  console.log('\n📄 Création des documents...');
  
  if (userIds.length === 0) {
    console.log('⚠️  Aucun utilisateur disponible pour créer des documents');
    return;
  }
  
  // Créer un fichier de test temporaire s'il n'existe pas
  const testFilePath = './z_scripts/seed-example.txt';
  if (!fs.existsSync(testFilePath)) {
    fs.writeFileSync(testFilePath, 'Ceci est un fichier d\'exemple créé par le script seed.\nIl contient du contenu de test pour démontrer le fonctionnement de Files Core CLI.');
  }
  
  for (let i = 0; i < SEED_DATA.documents.length; i++) {
    const docData = SEED_DATA.documents[i];
    const ownerId = userIds[i % userIds.length]; // Répartir les documents entre les utilisateurs
    const folderId = folderIds.length > 0 ? folderIds[i % folderIds.length] : undefined; // Répartir dans des dossiers
    
    try {
      const documentData = {
        ...docData,
        ownerId: ownerId,
        folderId: folderId,
        filePath: testFilePath // Utiliser le même fichier de test pour tous
      };
      
      const document = await documentService.createDocument(documentData);
      console.log(`   ✅ Document créé: ${document.name} (propriétaire: ${ownerId.substring(0, 8)}..., dossier: ${folderId ? folderId.substring(0, 8) + '...' : 'racine'})`);
    } catch (error) {
      console.log(`   ⚠️  Erreur création document ${docData.name}:`, error);
    }
  }
  
  console.log('✅ Documents traités');
}

async function displaySummary(): Promise<void> {
  console.log('\n📊 RÉSUMÉ DES DONNÉES CRÉÉES');
  console.log('═'.repeat(50));
  
  try {
    const [users, documents, logs] = await Promise.all([
      userService.getAllUsers(),
      documentService.getAllDocuments(), 
      logService.getAllLogs(50)
    ]);
    
    // Récupérer les dossiers pour le premier utilisateur
    let folders: any[] = [];
    if (users.length > 0) {
      try {
        folders = await folderService.getRootFolders(users[0].id);
      } catch (error) {
        console.log('⚠️  Impossible de récupérer les dossiers');
      }
    }
    
    console.log(`👤 Utilisateurs: ${users.length}`);
    users.forEach(user => {
      console.log(`   • ${user.name} (${user.email})`);
    });
    
    console.log(`\n📁 Dossiers: ${folders.length}`);
    folders.forEach(folder => {
      console.log(`   • ${folder.name} - ${folder.description || 'Pas de description'}`);
    });
    
    console.log(`\n📄 Documents: ${documents.length}`);
    documents.forEach(doc => {
      console.log(`   • ${doc.name} - ${doc.type} (${doc.owner?.name}) ${doc.isFavorite ? '⭐' : ''}`);
    });
    
    console.log(`\n📊 Logs d'activité: ${logs.length}`);
    
    console.log('\n✅ Données de test initialisées avec succès!');
    console.log('💡 Utilisez "npm run menu" pour explorer les fonctionnalités');
    
  } catch (error) {
    console.error('❌ Erreur lors du résumé:', error);
  }
}

async function main(): Promise<void> {
  console.log('🌱 Files Core - Initialisation des données de test');
  console.log('═'.repeat(60));
  
  try {
    // 1. Connexion à la base de données
    await prisma.$connect();
    console.log('✅ Connexion à la base de données établie');
    
    // 2. Nettoyage de la base de données
    await clearDatabase();
    
    // 3. Création des utilisateurs
    const userIds = await seedUsers();
    
    // 4. Création des dossiers
    const folderIds = await seedFolders(userIds);
    
    // 5. Création des configurations MEGA
    await seedMegaConfigs(userIds);
    
    // 6. Création des documents (uniquement si MEGA est configuré)
    const hasMegaConfig = process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD;
    if (hasMegaConfig) {
      console.log('🔧 Configuration MEGA détectée - Création avec stockage');
      await seedDocuments(userIds, folderIds);
    } else {
      console.log('⚠️  Pas de configuration MEGA - Documents ignorés');
      console.log('💡 Définissez MEGA_EMAIL et MEGA_PASSWORD pour tester le stockage');
    }
    
    // 7. Résumé final
    await displaySummary();
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Erreur fatale lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Point d'entrée
if (require.main === module) {
  main();
}
