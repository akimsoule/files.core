import { Command } from "commander";
import { CreateDocumentData, UpdateDocumentData } from "../../services/documentService";
import path from "path";
import { documentService } from "../../beans";

const documentCommands = new Command("document");

// Commande create
documentCommands
  .command('create')
  .description('📄 Creer un nouveau document a partir du template')
  .action(async () => {
    try {
      console.log('📄 Creation d\'un nouveau document a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/document/create/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const documentData: CreateDocumentData = {
        name: data.name,
        type: data.type,
        ownerEmail: data.ownerEmail,
        category: data.category,
        description: data.description,
        tags: data.tags,
        filePath: data.filePath,
      };
      
      // Gestion du fichier si filePath est fourni
      if (data.filePath) {
        console.log(`📁 Fichier specifie: ${data.filePath}`);
      }
      
      const document = await documentService.createDocument(documentData);
      
      console.log('✅ Document cree avec succes!');
      console.table([{
        ID: document.id,
        Nom: document.name,
        Type: document.type,
        Categorie: document.category,
        Taille: document.size,
        'File ID': document.fileId,
        'Cree le': document.createdAt,
      }]);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande read
documentCommands
  .command('read')
  .description('🔍 Lire un document a partir du template')
  .action(async () => {
    try {
      console.log('🔍 Lecture d\'un document a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/document/read/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const document = await documentService.getDocumentByNameAndOwner(data.name, data.ownerEmail);
      
      if (!document) {
        console.error('❌ Document non trouve');
        process.exit(1);
      }
      
      console.log('✅ Document trouve!');
      console.table([{
        ID: document.id,
        Nom: document.name,
        Type: document.type,
        Categorie: document.category,
        Description: document.description,
        Tags: Array.isArray(document.tags) ? document.tags.join(', ') : document.tags,
        Taille: document.size,
        'File ID': document.fileId,
        Proprietaire: document.owner.email,
        Favori: document.isFavorite ? '⭐' : '❌',
        'Cree le': document.createdAt,
        'Modifie le': document.modifiedAt,
      }]);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande list
documentCommands
  .command('list')
  .description('📋 Lister tous les documents a partir du template')
  .action(async () => {
    try {
      console.log('📋 Liste des documents a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/document/list/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const skip = data.skip || 0;
      const take = data.take || 10;
      
      // Construction des filtres
      const filters: any = {};
      if (data.category) filters.category = data.category;
      if (data.type) filters.type = data.type;
      if (data.ownerEmail) filters.ownerEmail = data.ownerEmail;
      if (data.search) filters.search = data.search;
      if (data.tags) filters.tags = data.tags;
      if (data.isFavorite !== undefined) filters.isFavorite = data.isFavorite;
      
      if (Object.keys(filters).length > 0) {
        console.log('🔍 Filtres appliques:', JSON.stringify(filters, null, 2));
      }
      
      const documents = await documentService.getAllDocuments(skip, take, filters);
      
      if (documents.length === 0) {
        console.log('ℹ️  Aucun document trouve');
        return;
      }
      
      console.log(`✅ ${documents.length} document(s) trouve(s):`);
      console.table(documents.map(doc => ({
        ID: doc.id.substring(0, 8) + '...',
        Nom: doc.name,
        Type: doc.type,
        Categorie: doc.category,
        Taille: doc.size,
        Proprietaire: doc.owner.email,
        Favori: doc.isFavorite ? '⭐' : '❌',
        'Cree le': new Date(doc.createdAt).toLocaleDateString('fr-FR'),
      })));
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande update
documentCommands
  .command('update')
  .description('✏️ Mettre a jour un document a partir du template')
  .action(async () => {
    try {
      console.log('✏️ Mise a jour d\'un document a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/document/update/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      // Obtenir le document par nom et proprietaire
      const existingDocument = await documentService.getDocumentByNameAndOwner(data.currentName, data.ownerEmail);
      if (!existingDocument) {
        console.error('❌ Document non trouve');
        process.exit(1);
      }
      
      const updateData: UpdateDocumentData = {};
      if (data.name) updateData.name = data.name;
      if (data.description) updateData.description = data.description;
      if (data.tags) updateData.tags = data.tags;
      if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
      
      const document = await documentService.updateDocument(existingDocument.id, updateData, data.ownerEmail);
      
      console.log('✅ Document mis a jour avec succes!');
      console.table([{
        ID: document.id,
        Nom: document.name,
        Description: document.description,
        Tags: Array.isArray(document.tags) ? document.tags.join(', ') : document.tags,
        Favori: document.isFavorite ? '⭐' : '❌',
        'Modifie le': document.modifiedAt,
      }]);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande delete
documentCommands
  .command('delete')
  .description('🗑️ Supprimer un document a partir du template')
  .action(async () => {
    try {
      console.log('🗑️ Suppression d\'un document a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/document/delete/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      if (!data.force) {
        console.log('⚠️  Cette action supprimera definitivement le document et le fichier associe.');
        console.log('   Modifiez le template (force: true) pour confirmer la suppression.');
        process.exit(0);
      }
      
      // Obtenir le document par nom et proprietaire
      const document = await documentService.getDocumentByNameAndOwner(data.name, data.ownerEmail);
      if (!document) {
        console.error('❌ Document non trouve');
        process.exit(1);
      }
      
      const result = await documentService.deleteDocument(document.id, data.ownerEmail);
      
      console.log('✅ Document supprime avec succes!');
      console.log(`📊 ${result.message}`);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export { documentCommands };
