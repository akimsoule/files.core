import prisma from './database';
import { LogService } from './logService';
import { MegaStorageService } from './megaStorage';
import crypto from 'crypto';

export interface BackupData {
  version: string;
  createdAt: Date;
  users: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    size: number;
    description?: string;
    tags: string;
    fileId: string;
    hash: string;
    ownerId: string;
    isFavorite: boolean;
    createdAt: Date;
    modifiedAt: Date;
    owner: {
      id: string;
      email: string;
      name: string;
    };
  }[];
  logs: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    documentId?: string;
    createdAt: Date;
    user?: {
      id: string;
      email: string;
      name: string;
    };
    document?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  metadata: {
    totalUsers: number;
    totalDocuments: number;
    totalLogs: number;
    totalSize: number;
  };
}

export interface BackupOptions {
  includeLogs?: boolean;
  maxLogAge?: number; // jours
}

export interface RestoreOptions {
  replaceExisting?: boolean;
  includeLogs?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  filePath?: string;
  megaFileId?: string;
  size: number;
  duration: number;
  metadata: {
    totalUsers: number;
    totalDocuments: number;
    totalLogs: number;
  };
}

export class BackupService {
  private logService: LogService;
  private megaStorageService: MegaStorageService;

  constructor(logService: LogService, megaStorageService: MegaStorageService) {
    this.logService = logService;
    this.megaStorageService = megaStorageService;
  }

  /**
   * Crée une sauvegarde complète du système
   */
  async createBackup(options: BackupOptions = {}, userId: string): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = crypto.randomUUID();
    
    const {
      includeLogs = true,
      maxLogAge = 90,
    } = options;

    try {
      // Collecte des données
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const documents = await prisma.document.findMany({
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      let logs: BackupData['logs'] = [];
      if (includeLogs) {
        const logCutoffDate = new Date(Date.now() - maxLogAge * 24 * 60 * 60 * 1000);
        const rawLogs = await prisma.log.findMany({
          where: {
            createdAt: { gte: logCutoffDate },
          },
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
            document: {
              select: { id: true, name: true, type: true },
            },
          },
        });
        
        logs = rawLogs.map(log => ({
          ...log,
          details: log.details || undefined,
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined,
          userId: log.userId || undefined,
          documentId: log.documentId || undefined,
          user: log.user || undefined,
          document: log.document || undefined,
        }));
      }

      // Création de l'objet de sauvegarde
      const backupData: BackupData = {
        version: '1.0.0',
        createdAt: new Date(),
        users: users.map(user => ({ ...user, passwordHash: '[ENCRYPTED]' })), // Masquer les mots de passe
        documents: documents.map(doc => ({
          ...doc,
          description: doc.description || undefined,
        })),
        logs,
        metadata: {
          totalUsers: users.length,
          totalDocuments: documents.length,
          totalLogs: logs.length,
          totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
        },
      };

      // Sérialisation et compression
      const jsonData = JSON.stringify(backupData, null, 2);
      const buffer = Buffer.from(jsonData, 'utf8');

      // Sauvegarde sur MEGA
      const fileName = `backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;
      const megaFileId = await this.megaStorageService.uploadFile(
        fileName,
        'application/json',
        buffer,
        undefined,
        userId
      );

      const duration = Date.now() - startTime;

      // Log de l'opération
      await this.logService.log({
        action: 'SYSTEM_BACKUP',
        entity: 'SYSTEM',
        entityId: backupId,
        userId,
        details: `Sauvegarde créée: ${fileName} (${buffer.length} bytes, ${duration}ms)`,
      });

      return {
        success: true,
        backupId,
        megaFileId,
        size: buffer.length,
        duration,
        metadata: backupData.metadata,
      };

    } catch (error) {
      await this.logService.log({
        action: 'SYSTEM_BACKUP',
        entity: 'SYSTEM',
        entityId: backupId,
        userId,
        details: `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : error}`,
      });

      throw new Error(`Erreur lors de la création de la sauvegarde: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Restaure le système à partir d'une sauvegarde
   */
  async restoreBackup(
    megaFileId: string,
    options: RestoreOptions = {},
    userId: string
  ): Promise<{ success: boolean; restored: { users: number; documents: number; logs: number }; duration: number }> {
    const startTime = Date.now();
    
    const {
      replaceExisting = false,
      includeLogs = false,
    } = options;

    try {
      // Téléchargement de la sauvegarde
      const backupBuffer = await this.megaStorageService.downloadFile(megaFileId, userId);
      const backupData: BackupData = JSON.parse(backupBuffer.toString('utf8'));

      const restored = {
        users: 0,
        documents: 0,
        logs: 0,
      };

      // Validation de la version
      if (!backupData.version || backupData.version !== '1.0.0') {
        throw new Error('Version de sauvegarde non supportée');
      }

      // Restauration des utilisateurs
      if (replaceExisting) {
        await prisma.user.deleteMany({});
      }

      for (const userData of backupData.users) {
        try {
          await prisma.user.upsert({
            where: { email: userData.email },
            update: {
              name: userData.name,
              // Le mot de passe n'est pas restauré pour des raisons de sécurité
            },
            create: {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              passwordHash: crypto.randomBytes(32).toString('hex'), // Mot de passe temporaire
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            },
          });
          restored.users++;
        } catch (error) {
          console.warn(`Erreur lors de la restauration de l'utilisateur ${userData.email}:`, error);
        }
      }

      // Restauration des documents
      if (replaceExisting) {
        await prisma.document.deleteMany({});
      }

      for (const docData of backupData.documents) {
        try {
          await prisma.document.upsert({
            where: { hash: docData.hash },
            update: {
              name: docData.name,
              type: docData.type,
              size: docData.size,
              description: docData.description,
              tags: docData.tags,
              isFavorite: docData.isFavorite,
              modifiedAt: docData.modifiedAt,
            },
            create: {
              id: docData.id,
              name: docData.name,
              type: docData.type,
              size: docData.size,
              description: docData.description,
              tags: docData.tags,
              fileId: docData.fileId,
              hash: docData.hash,
              ownerId: docData.ownerId,
              isFavorite: docData.isFavorite,
              createdAt: docData.createdAt,
              modifiedAt: docData.modifiedAt,
            },
          });
          restored.documents++;
        } catch (error) {
          console.warn(`Erreur lors de la restauration du document ${docData.name}:`, error);
        }
      }

      // Restauration des logs (optionnel)
      if (includeLogs && backupData.logs) {
        for (const logData of backupData.logs) {
          try {
            await prisma.log.create({
              data: {
                id: logData.id,
                action: logData.action,
                entity: logData.entity,
                entityId: logData.entityId,
                details: logData.details,
                ipAddress: logData.ipAddress,
                userAgent: logData.userAgent,
                userId: logData.userId,
                documentId: logData.documentId,
                createdAt: logData.createdAt,
              },
            });
            restored.logs++;
          } catch (error) {
            console.warn(`Erreur lors de la restauration du log ${logData.id}:`, error);
          }
        }
      }

      const duration = Date.now() - startTime;

      // Log de l'opération
      await this.logService.log({
        action: 'SYSTEM_RESTORE',
        entity: 'SYSTEM',
        entityId: megaFileId,
        userId,
        details: `Restauration effectuée: ${restored.users} utilisateurs, ${restored.documents} documents, ${restored.logs} logs (${duration}ms)`,
      });

      return {
        success: true,
        restored,
        duration,
      };

    } catch (error) {
      await this.logService.log({
        action: 'SYSTEM_RESTORE',
        entity: 'SYSTEM',
        entityId: megaFileId,
        userId,
        details: `Erreur lors de la restauration: ${error instanceof Error ? error.message : error}`,
      });

      throw new Error(`Erreur lors de la restauration: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Liste les sauvegardes disponibles sur MEGA
   */
  async listBackups(userId: string): Promise<Array<{
    fileId: string;
    name: string;
    size: number;
    date: Date;
  }>> {
    try {
      const files = await this.megaStorageService.getAllFilesWithContent(userId);
      
      return files
        .filter(file => file.name.startsWith('backup-') && file.name.endsWith('.json'))
        .map(file => ({
          fileId: file.fileId,
          name: file.name,
          size: file.buffer.length,
          date: this.extractDateFromBackupName(file.name),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des sauvegardes: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Supprime une sauvegarde
   */
  async deleteBackup(megaFileId: string, userId: string): Promise<void> {
    try {
      await this.megaStorageService.deleteFile(megaFileId, userId);

      await this.logService.log({
        action: 'SYSTEM_BACKUP',
        entity: 'SYSTEM',
        entityId: megaFileId,
        userId,
        details: `Sauvegarde supprimée: ${megaFileId}`,
      });
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la sauvegarde: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Valide l'intégrité d'une sauvegarde
   */
  async validateBackup(megaFileId: string, userId: string): Promise<{
    valid: boolean;
    errors: string[];
    metadata?: {
      totalUsers: number;
      totalDocuments: number;
      totalLogs: number;
      totalSize: number;
    };
  }> {
    const errors: string[] = [];

    try {
      const backupBuffer = await this.megaStorageService.downloadFile(megaFileId, userId);
      const backupData: BackupData = JSON.parse(backupBuffer.toString('utf8'));

      // Validation de la structure
      if (!backupData.version) {
        errors.push('Version manquante');
      }

      if (!backupData.metadata) {
        errors.push('Métadonnées manquantes');
      }

      if (!Array.isArray(backupData.users)) {
        errors.push('Liste des utilisateurs invalide');
      }

      if (!Array.isArray(backupData.documents)) {
        errors.push('Liste des documents invalide');
      }

      // Validation des données
      if (backupData.users) {
        backupData.users.forEach((user, index) => {
          if (!user.id || !user.email) {
            errors.push(`Utilisateur ${index} invalide: ID ou email manquant`);
          }
        });
      }

      if (backupData.documents) {
        backupData.documents.forEach((doc, index) => {
          if (!doc.id || !doc.hash || !doc.ownerId) {
            errors.push(`Document ${index} invalide: données manquantes`);
          }
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        metadata: backupData.metadata,
      };

    } catch (error) {
      errors.push(`Erreur de parsing: ${error instanceof Error ? error.message : error}`);
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Extrait la date d'un nom de fichier de sauvegarde
   */
  private extractDateFromBackupName(fileName: string): Date {
    const match = fileName.match(/backup-[^-]+-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1]);
    }
    return new Date(0); // Date par défaut si extraction échoue
  }

  /**
   * Crée une sauvegarde automatique programmée
   */
  async createScheduledBackup(userId: string): Promise<BackupResult> {
    return this.createBackup({
      includeLogs: true,
      maxLogAge: 30,
    }, userId);
  }
}