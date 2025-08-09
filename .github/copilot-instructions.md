<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Files Core CLI - Instructions pour Copilot

## Contexte du projet
Ce projet est un CLI TypeScript CRUD pour la gestion de documents avec :
- Base de données PostgreSQL via Prisma ORM
- Stockage de fichiers sur MEGA
- Système de logs complet
- Interface en ligne de commande avec Commander.js

## Architecture et conventions

### Structure des fichiers
- `src/commands/` : Commandes CLI organisées par domaine
- `src/services/` : Logique métier et intégrations
- `src/index.ts` : Point d'entrée principal

### Conventions de nommage
- Services : `*Service` (ex: `UserService`, `DocumentService`)
- Commandes : `*Commands` (ex: `userCommands`, `documentCommands`)
- Interfaces : Préfixer avec le nom du service (ex: `CreateUserData`)

### Gestion des erreurs
- Utiliser try/catch dans les commandes CLI
- Afficher des messages d'erreur clairs avec des émojis
- Terminer avec `process.exit(1)` en cas d'erreur

### Logs
- Utiliser `LogService.log()` pour tracer toutes les actions importantes
- Inclure l'ID utilisateur et les détails pertinents
- Respecter les types `LogAction` et `LogEntity` définis

### Base de données
- Utiliser Prisma Client via `src/services/database.ts`
- Inclure les relations nécessaires dans les requêtes
- Gérer les erreurs de contraintes (email unique, etc.)

### Stockage MEGA
- Utiliser les fonctions dans `src/services/megaStorage.ts`
- Gérer les erreurs de connexion et d'upload
- Nettoyer les fichiers en cas d'erreur

### Interface CLI
- Messages d'aide clairs et complets
- Utiliser `console.table()` pour l'affichage des listes
- Émojis pour améliorer l'UX : ✅ ❌ 📄 👤 📋 ⚠️ 🔍 etc.
- Options cohérentes (`-s --skip`, `-t --take`, `-f --force`)

## Exemples de patterns à suivre

### Service pattern
```typescript
export class ServiceName {
  async methodName(params) {
    // Logique métier
    
    // Log de l'action
    await LogService.log({
      action: 'ACTION_NAME',
      entity: 'ENTITY_NAME',
      entityId: id,
      userId: userId,
      details: 'Description de l\'action',
    });
    
    return result;
  }
}
```

### Commande CLI pattern
```typescript
command
  .command('action-name')
  .description('Description claire')
  .requiredOption('-r, --required <value>', 'Option requise')
  .option('-o, --optional <value>', 'Option optionnelle')
  .action(async (options) => {
    try {
      // Validation des paramètres
      
      // Appel du service
      const result = await Service.method(options);
      
      // Affichage du résultat
      console.log('✅ Action réussie');
      console.table(result);
    } catch (error) {
      console.error('❌ Erreur:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
```

### Gestion des fichiers
- Vérifier l'existence des fichiers avant lecture
- Utiliser `path.resolve()` pour les chemins absolus
- Déterminer le MIME type automatiquement
- Gérer les erreurs d'I/O

## Bonnes pratiques spécifiques

1. **Sécurité** : Ne jamais logger les mots de passe
2. **Performance** : Limiter les résultats avec skip/take
3. **UX** : Confirmer les actions destructrices avec `--force`
4. **Maintenance** : Documenter les nouvelles fonctionnalités
5. **Tests** : Valider les entrées utilisateur

## Types TypeScript importants
- `LogAction` et `LogEntity` pour les logs
- Interfaces de données pour les services
- Types Prisma générés automatiquement
