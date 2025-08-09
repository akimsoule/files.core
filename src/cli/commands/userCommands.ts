import { Command } from 'commander';
import { CreateUserData, UpdateUserData } from '../../services/userService';
import path from 'path';
import { userService } from '../../beans';

const userCommands = new Command('user');

// Commande create
userCommands
  .command('create')
  .description('👤 Creer un nouvel utilisateur a partir du template')
  .action(async () => {
    try {
      console.log('👤 Creation d\'un nouvel utilisateur a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/create/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const userData: CreateUserData = {
        email: data.email,
        name: data.name,
        password: data.password,
      };
      
      const user = await userService.createUser(userData);
      
      console.log('✅ Utilisateur cree avec succes!');
      console.table([{
        ID: user.id,
        Email: user.email,
        Nom: user.name,
        'Cree le': user.createdAt,
      }]);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande read
userCommands
  .command('read')
  .description('🔍 Lire un utilisateur a partir du template')
  .action(async () => {
    try {
      console.log('🔍 Lecture d\'un utilisateur a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/read/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const user = await userService.getUserByEmail(data.email);
      
      if (!user) {
        console.error('❌ Utilisateur non trouve');
        process.exit(1);
      }
      
      console.log('✅ Utilisateur trouve!');
      console.table([{
        ID: user.id,
        Email: user.email,
        Nom: user.name,
        'Cree le': user.createdAt,
        'Modifie le': user.updatedAt,
      }]);
      
      // Rechercher les documents de cet utilisateur
      console.log('\n🔍 Recherche des documents...');
      // TODO: Implementer une methode pour recuperer les documents par email utilisateur
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande list
userCommands
  .command('list')
  .description('📋 Lister tous les utilisateurs a partir du template')
  .action(async () => {
    try {
      console.log('📋 Liste des utilisateurs a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/list/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const skip = data.skip || 0;
      const take = data.take || 10;
      
      const users = await userService.getAllUsers(skip, take);
      
      if (users.length === 0) {
        console.log('ℹ️  Aucun utilisateur trouve');
        return;
      }
      
      console.log(`✅ ${users.length} utilisateur(s) trouve(s):`);
      console.table(users.map(user => ({
        ID: user.id,
        Email: user.email,
        Nom: user.name,
        'Cree le': new Date(user.createdAt).toLocaleDateString('fr-FR'),
        'Documents': user._count.documents,
      })));
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande update
userCommands
  .command('update')
  .description('✏️ Mettre a jour un utilisateur a partir du template')
  .action(async () => {
    try {
      console.log('✏️ Mise a jour d\'un utilisateur a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/update/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      // Obtenir l'utilisateur par email pour avoir l'ID
      const existingUser = await userService.getUserByEmail(data.email);
      if (!existingUser) {
        console.error('❌ Utilisateur non trouve');
        process.exit(1);
      }
      
      const updateData: UpdateUserData = {};
      if (data.name) updateData.name = data.name;
      if (data.newEmail) updateData.email = data.newEmail;
      if (data.password) updateData.password = data.password;
      
      const user = await userService.updateUser(existingUser.id, updateData);
      
      console.log('✅ Utilisateur mis a jour avec succes!');
      console.table([{
        ID: user.id,
        Email: user.email,
        Nom: user.name,
        'Modifie le': user.updatedAt,
      }]);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande delete
userCommands
  .command('delete')
  .description('🗑️ Supprimer un utilisateur a partir du template')
  .action(async () => {
    try {
      console.log('🗑️ Suppression d\'un utilisateur a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/delete/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      if (!data.force) {
        console.log('⚠️  Cette action supprimera l\'utilisateur et tous ses documents.');
        console.log('   Modifiez le template (force: true) pour confirmer la suppression.');
        process.exit(0);
      }
      
      // Obtenir l'utilisateur par email pour avoir l'ID
      const user = await userService.getUserByEmail(data.email);
      if (!user) {
        console.error('❌ Utilisateur non trouve');
        process.exit(1);
      }
      
      const result = await userService.deleteUser(user.id);
      
      console.log('✅ Utilisateur supprime avec succes!');
      console.log(`📊 ${result.message}`);
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande verify
userCommands
  .command('verify')
  .description('🔐 Verifier un mot de passe utilisateur a partir du template')
  .action(async () => {
    try {
      console.log('🔐 Verification du mot de passe a partir du template...');
      
      // Charger les donnees depuis le template
      const templatePath = path.join(__dirname, '../template/user/verify/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Donnees du template:');
      console.table(data);
      
      const user = await userService.verifyPassword(data.email, data.password);
      
      if (user) {
        console.log('✅ Mot de passe correct!');
        console.table([{
          ID: user.id,
          Email: user.email,
          Nom: user.name,
        }]);
      } else {
        console.log('❌ Mot de passe incorrect ou utilisateur non trouve');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export { userCommands };
