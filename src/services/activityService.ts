import prisma from './database';

export interface ActivityData {
  id: string;
  type: string;
  document: string;
  documentId: string;
  userId: string;
  date: string;
  details?: Record<string, unknown>;
}

export class ActivityService {
  /**
   * Récupère les activités récentes de l'utilisateur
   */
  async getRecentActivities(userId: string, limit: number = 10): Promise<ActivityData[]> {
    try {
      // Récupérer les logs récents avec les détails des documents
      const logs = await prisma.log.findMany({
        where: {
          userId: userId,
          action: {
            in: [
              'DOCUMENT_CREATE',
              'DOCUMENT_UPDATE', 
              'DOCUMENT_UPLOAD',
              'DOCUMENT_DOWNLOAD',
              'DOCUMENT_FAVORITE',
              'DOCUMENT_UNFAVORITE'
            ]
          }
        },
        include: {
          document: {
            select: {
              name: true,
              type: true,
              size: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      // Transformer les logs en activités
      const activities: ActivityData[] = logs.map(log => ({
        id: log.id,
        type: this.mapActionToActivityType(log.action),
        document: log.document?.name || 'Document supprimé',
        documentId: log.documentId || '',
        userId: log.userId || '',
        date: log.createdAt.toISOString(),
        details: {
          action: log.action,
          entity: log.entity,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          documentDetails: log.document ? {
            type: log.document.type,
            size: log.document.size
          } : null,
          additionalDetails: log.details
        }
      }));

      return activities;
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      throw new Error('Impossible de récupérer les activités récentes');
    }
  }

  /**
   * Récupère les activités récentes globales (admin)
   */
  async getGlobalRecentActivities(limit: number = 10): Promise<ActivityData[]> {
    try {
      // Récupérer les logs récents de tous les utilisateurs
      const logs = await prisma.log.findMany({
        where: {
          action: {
            in: [
              'DOCUMENT_CREATE',
              'DOCUMENT_UPDATE', 
              'DOCUMENT_UPLOAD',
              'DOCUMENT_DOWNLOAD',
              'USER_CREATE',
              'USER_LOGIN'
            ]
          }
        },
        include: {
          document: {
            select: {
              name: true,
              type: true,
              size: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      // Transformer les logs en activités
      const activities: ActivityData[] = logs.map(log => ({
        id: log.id,
        type: this.mapActionToActivityType(log.action),
        document: log.document?.name || log.user?.name || 'Activité système',
        documentId: log.documentId || '',
        userId: log.userId || '',
        date: log.createdAt.toISOString(),
        details: {
          action: log.action,
          entity: log.entity,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          user: log.user ? {
            name: log.user.name,
            email: log.user.email
          } : null,
          documentDetails: log.document ? {
            type: log.document.type,
            size: log.document.size
          } : null,
          additionalDetails: log.details
        }
      }));

      return activities;
    } catch (error) {
      console.error('Erreur lors de la récupération des activités globales:', error);
      throw new Error('Impossible de récupérer les activités globales');
    }
  }

  /**
   * Convertit une action de log en type d'activité lisible
   */
  private mapActionToActivityType(action: string): string {
    const actionMap: Record<string, string> = {
      'DOCUMENT_CREATE': 'create',
      'DOCUMENT_UPDATE': 'edit',
      'DOCUMENT_UPLOAD': 'upload',
      'DOCUMENT_DOWNLOAD': 'download',
      'DOCUMENT_FAVORITE': 'favorite',
      'DOCUMENT_UNFAVORITE': 'unfavorite',
      'USER_CREATE': 'signup',
      'USER_LOGIN': 'login',
      'USER_UPDATE': 'profile_update'
    };

    return actionMap[action] || 'activity';
  }

  /**
   * Récupère le nombre total d'activités récentes pour un utilisateur
   */
  async getRecentActivitiesCount(userId: string): Promise<number> {
    try {
      return await prisma.log.count({
        where: {
          userId: userId,
          action: {
            in: [
              'DOCUMENT_CREATE',
              'DOCUMENT_UPDATE', 
              'DOCUMENT_UPLOAD',
              'DOCUMENT_DOWNLOAD',
              'DOCUMENT_FAVORITE',
              'DOCUMENT_UNFAVORITE'
            ]
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors du comptage des activités récentes:', error);
      return 0;
    }
  }
}

// Export d'une instance unique
export const activityService = new ActivityService();
