import { Command } from 'commander';
import { LogService } from '../../services/logService';
import path from 'path';
import { logService } from '../../beans';

const logCommands = new Command('log');

// Commande list
logCommands
  .command('list')
  .description('📋 Lister les logs à partir du template')
  .action(async () => {
    try {
      console.log('📋 Consultation des logs à partir du template...');
      
      // Charger les données depuis le template
      const templatePath = path.join(__dirname, '../template/log/list/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Configuration du template:');
      console.table(data);
      
      const limit = parseInt(data.limit.toString());
      const offset = parseInt(data.offset.toString());
      
      let logs;
      
      if (data.filterType === "user" && data.userEmail) {
        console.log(`📋 Logs pour l'utilisateur ${data.userEmail}...`);
        logs = await logService.getUserLogsByEmail(data.userEmail, limit);
      } else if (data.filterType === "document" && data.documentId) {
        console.log(`📋 Logs pour le document ${data.documentId}...`);
        logs = await logService.getDocumentLogs(data.documentId, limit);
      } else {
        console.log(`📋 Liste des logs récents (${offset}-${offset + limit})...`);
        logs = await logService.getAllLogs(limit, offset);
      }
      
      if (logs.length === 0) {
        console.log('ℹ️  Aucun log trouvé');
        return;
      }
      
      console.log(`✅ ${logs.length} log(s) trouvé(s):`);
      console.table(logs.map(log => ({
        ID: log.id.substring(0, 8) + '...',
        Action: log.action,
        Entité: log.entity,
        Utilisateur: log.user?.email || 'N/A',
        Document: log.document?.name || 'N/A',
        Détails: log.details || '',
        Date: new Date(log.createdAt).toLocaleString('fr-FR'),
      })));
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande search
logCommands
  .command('search')
  .description('🔍 Rechercher dans les logs à partir du template')
  .action(async () => {
    try {
      console.log('🔍 Recherche dans les logs à partir du template...');
      
      // Charger les données depuis le template
      const templatePath = path.join(__dirname, '../template/log/search/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Configuration de recherche:');
      console.table(data);
      
      const term = data.term;
      const limit = parseInt(data.limit.toString());
      
      console.log(`🔍 Recherche de "${term}" dans les logs...`);
      
      // Pour l'instant, on récupère tous les logs et on filtre côté client
      // Dans une vraie application, on ferait ça côté base de données
      const allLogs = await logService.getAllLogs(1000); // Limite plus élevée pour la recherche

      let filteredLogs;
      
      if (data.searchIn === "details") {
        filteredLogs = allLogs.filter(log => 
          log.details?.toLowerCase().includes(term.toLowerCase())
        );
      } else if (data.searchIn === "action") {
        filteredLogs = allLogs.filter(log => 
          log.action.toLowerCase().includes(term.toLowerCase())
        );
      } else if (data.searchIn === "user") {
        filteredLogs = allLogs.filter(log => 
          log.user?.email?.toLowerCase().includes(term.toLowerCase())
        );
      } else if (data.searchIn === "document") {
        filteredLogs = allLogs.filter(log => 
          log.document?.name?.toLowerCase().includes(term.toLowerCase())
        );
      } else {
        // Recherche dans tous les champs
        filteredLogs = allLogs.filter(log => 
          log.details?.toLowerCase().includes(term.toLowerCase()) ||
          log.action.toLowerCase().includes(term.toLowerCase()) ||
          log.user?.email?.toLowerCase().includes(term.toLowerCase()) ||
          log.document?.name?.toLowerCase().includes(term.toLowerCase())
        );
      }
      
      filteredLogs = filteredLogs.slice(0, limit);
      
      if (filteredLogs.length === 0) {
        console.log(`ℹ️  Aucun log trouvé contenant "${term}"`);
        return;
      }
      
      console.log(`✅ ${filteredLogs.length} log(s) trouvé(s) contenant "${term}":`);
      console.table(filteredLogs.map(log => ({
        ID: log.id.substring(0, 8) + '...',
        Action: log.action,
        Entité: log.entity,
        Utilisateur: log.user?.email || 'N/A',
        Document: log.document?.name || 'N/A',
        Détails: log.details || '',
        Date: new Date(log.createdAt).toLocaleString('fr-FR'),
      })));
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Commande stats
logCommands
  .command('stats')
  .description('📊 Statistiques des logs à partir du template')
  .action(async () => {
    try {
      console.log('📊 Génération des statistiques à partir du template...');
      
      // Charger les données depuis le template
      const templatePath = path.join(__dirname, '../template/log/stats/index.ts');
      console.log(`📋 Chargement du template: ${templatePath}`);
      
      // Import dynamique du template
      const templateData = await import(templatePath);
      const data = templateData.default;
      
      console.log('📋 Configuration des statistiques:');
      console.table(data);
      
      console.log('📊 Calcul des statistiques...');
      
      const maxLogs = parseInt(data.maxLogs.toString());
      const topActions = parseInt(data.topActions.toString());
      const daysPeriod = parseInt(data.daysPeriod.toString());

      const allLogs = await logService.getAllLogs(maxLogs);

      // Statistiques par action
      const actionStats = allLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Statistiques par entité
      const entityStats = allLogs.reduce((acc, log) => {
        acc[log.entity] = (acc[log.entity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Logs par période définie
      const periodDate = new Date();
      periodDate.setDate(periodDate.getDate() - daysPeriod);
      const recentLogs = allLogs.filter(log => new Date(log.createdAt) > periodDate);
      
      console.log('\n📊 STATISTIQUES DES LOGS');
      console.log('========================');
      
      console.log(`\n📋 Total des logs: ${allLogs.length}`);
      console.log(`📅 Logs des ${daysPeriod} derniers jours: ${recentLogs.length}`);
      
      if (data.showDetails) {
        console.log(`\n🎯 Top ${topActions} actions les plus fréquentes:`);
        console.table(Object.entries(actionStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, topActions)
          .map(([action, count]) => ({ Action: action, Nombre: count }))
        );
        
        console.log('\n🗂️ Répartition par entité:');
        console.table(Object.entries(entityStats)
          .map(([entity, count]) => ({ Entité: entity, Nombre: count }))
        );
      }
      
      if (data.showCharts) {
        console.log('\n📈 Graphiques: Fonctionnalité à implémenter');
      }
      
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export { logCommands };
