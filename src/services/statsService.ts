import prisma from './database';
import { LogService } from './logService';

export interface TagStat {
  name: string;
  count: number;
  totalSize: number;
  averageSize: number;
  lastDocumentDate?: Date;
}

export interface SystemStats {
  totalDocuments: number;
  totalSize: number;
  totalUsers: number;
  tagsStats: TagStat[];
  typeStats: { type: string; count: number; totalSize: number }[];
  recentActivity: number; // Documents créés dans les 7 derniers jours
  favoriteDocuments: number;
  documentsWithTags: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  documentCount: number;
  totalSize: number;
  favoriteCount: number;
  tagsUsed: string[];
  mostUsedType: string;
  lastActivity?: Date;
}

export interface TimeRangeStats {
  daily: { date: string; count: number; size: number }[];
  weekly: { week: string; count: number; size: number }[];
  monthly: { month: string; count: number; size: number }[];
}

export class StatsService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Obtient les statistiques générales du système
   */
  async getSystemStats(): Promise<SystemStats> {
    const [
      totalDocuments,
      totalSize,
      totalUsers,
      allDocuments, // On récupère tous les documents pour analyser les tags
      typesData,
      recentDocs,
      favoriteDocs,
      docsWithTags,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.aggregate({ _sum: { size: true } }),
      prisma.user.count(),
      prisma.document.findMany({
        select: { tags: true, size: true, createdAt: true },
        where: { tags: { not: '' } }, // Seulement les documents avec tags
      }),
      prisma.document.groupBy({
        by: ['type'],
        _count: { type: true },
        _sum: { size: true },
      }),
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
          },
        },
      }),
      prisma.document.count({ where: { isFavorite: true } }),
      prisma.document.count({ where: { tags: { not: '' } } }),
    ]);

    // Analyser les tags et calculer les statistiques
    const tagStats = new Map<string, { count: number; totalSize: number; lastDate?: Date }>();
    
    allDocuments.forEach(doc => {
      if (doc.tags) {
        const tags = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
        tags.forEach(tag => {
          const existing = tagStats.get(tag) || { count: 0, totalSize: 0 };
          tagStats.set(tag, {
            count: existing.count + 1,
            totalSize: existing.totalSize + doc.size,
            lastDate: !existing.lastDate || doc.createdAt > existing.lastDate 
              ? doc.createdAt 
              : existing.lastDate,
          });
        });
      }
    });

    const tagsStats: TagStat[] = Array.from(tagStats.entries()).map(([tag, stats]) => ({
      name: tag,
      count: stats.count,
      totalSize: stats.totalSize,
      averageSize: stats.totalSize / stats.count,
      lastDocumentDate: stats.lastDate,
    }));

    const typeStats = typesData.map(type => ({
      type: type.type,
      count: type._count.type || 0,
      totalSize: type._sum.size || 0,
    }));

    return {
      totalDocuments,
      totalSize: totalSize._sum.size || 0,
      totalUsers,
      tagsStats,
      typeStats,
      recentActivity: recentDocs,
      favoriteDocuments: favoriteDocs,
      documentsWithTags: docsWithTags,
    };
  }

  /**
   * Obtient les statistiques pour un utilisateur spécifique
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const [
      documents,
      favoriteCount,
      lastActivity,
    ] = await Promise.all([
      prisma.document.findMany({
        where: { ownerId: userId },
        select: { tags: true, type: true, size: true },
      }),
      prisma.document.count({
        where: { ownerId: userId, isFavorite: true },
      }),
      prisma.document.findFirst({
        where: { ownerId: userId },
        orderBy: { modifiedAt: 'desc' },
        select: { modifiedAt: true },
      }),
    ]);

    // Extraire tous les tags uniques utilisés par l'utilisateur
    const allTags = new Set<string>();
    documents.forEach(doc => {
      if (doc.tags) {
        const tags = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
        tags.forEach(tag => allTags.add(tag));
      }
    });
    const tagsUsed = Array.from(allTags);

    const typeCounts = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedType = Object.entries(typeCounts).reduce((a, b) => 
      typeCounts[a[0]] > typeCounts[b[0]] ? a : b
    )?.[0] || '';

    return {
      userId,
      userName: user.name,
      userEmail: user.email,
      documentCount: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
      favoriteCount,
      tagsUsed,
      mostUsedType,
      lastActivity: lastActivity?.modifiedAt,
    };
  }

  /**
   * Obtient les statistiques sur une période donnée
   */
  async getTimeRangeStats(days: number = 30): Promise<TimeRangeStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const documents = await prisma.document.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        size: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Statistiques journalières
    const dailyStats = new Map<string, { count: number; size: number }>();
    const weeklyStats = new Map<string, { count: number; size: number }>();
    const monthlyStats = new Map<string, { count: number; size: number }>();

    documents.forEach(doc => {
      const date = doc.createdAt;
      const dayKey = date.toISOString().split('T')[0];
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Jour
      if (!dailyStats.has(dayKey)) {
        dailyStats.set(dayKey, { count: 0, size: 0 });
      }
      const dailyStat = dailyStats.get(dayKey)!;
      dailyStat.count++;
      dailyStat.size += doc.size;

      // Semaine
      if (!weeklyStats.has(weekKey)) {
        weeklyStats.set(weekKey, { count: 0, size: 0 });
      }
      const weeklyStat = weeklyStats.get(weekKey)!;
      weeklyStat.count++;
      weeklyStat.size += doc.size;

      // Mois
      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, { count: 0, size: 0 });
      }
      const monthlyStat = monthlyStats.get(monthKey)!;
      monthlyStat.count++;
      monthlyStat.size += doc.size;
    });

    return {
      daily: Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        count: stats.count,
        size: stats.size,
      })),
      weekly: Array.from(weeklyStats.entries()).map(([week, stats]) => ({
        week,
        count: stats.count,
        size: stats.size,
      })),
      monthly: Array.from(monthlyStats.entries()).map(([month, stats]) => ({
        month,
        count: stats.count,
        size: stats.size,
      })),
    };
  }

  /**
   * Obtient les statistiques des utilisateurs les plus actifs
   */
  async getTopUsers(limit: number = 10): Promise<UserStats[]> {
    const users = await prisma.user.findMany({
      include: {
        documents: {
          select: {
            size: true,
            tags: true,
            type: true,
            isFavorite: true,
            modifiedAt: true,
          },
        },
      },
    });

    const userStats = users.map(user => {
      const docs = user.documents;
      
      // Extraire tous les tags uniques utilisés par l'utilisateur
      const allTags = new Set<string>();
      docs.forEach(doc => {
        if (doc.tags) {
          const tags = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
          tags.forEach(tag => allTags.add(tag));
        }
      });
      const tagsUsed = Array.from(allTags);

      const typeCounts = docs.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedType = Object.entries(typeCounts).reduce((a, b) => 
        typeCounts[a[0]] > typeCounts[b[0]] ? a : b
      )?.[0] || '';

      const lastActivity = docs.length > 0 
        ? new Date(Math.max(...docs.map(doc => doc.modifiedAt.getTime())))
        : undefined;

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        documentCount: docs.length,
        totalSize: docs.reduce((sum, doc) => sum + doc.size, 0),
        favoriteCount: docs.filter(doc => doc.isFavorite).length,
        tagsUsed,
        mostUsedType,
        lastActivity,
      };
    });

    return userStats
      .sort((a, b) => b.documentCount - a.documentCount)
      .slice(0, limit);
  }

  /**
   * Obtient les tags les plus populaires
   */
  async getPopularTags(limit: number = 10): Promise<TagStat[]> {
    const stats = await this.getSystemStats();
    return stats.tagsStats
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtient les statistiques de stockage par type de fichier
   */
  async getStorageStatsByType() {
    const typeStats = await prisma.document.groupBy({
      by: ['type'],
      _count: { type: true },
      _sum: { size: true },
      _avg: { size: true },
      _max: { size: true },
      _min: { size: true },
    });

    return typeStats
      .map(stat => ({
        type: stat.type,
        count: stat._count.type,
        totalSize: stat._sum.size || 0,
        averageSize: stat._avg.size || 0,
        maxSize: stat._max.size || 0,
        minSize: stat._min.size || 0,
      }))
      .sort((a, b) => b.totalSize - a.totalSize);
  }

  /**
   * Génère un rapport complet pour l'administration
   */
  async generateAdminReport(userId: string) {
    const [
      systemStats,
      timeRangeStats,
      topUsers,
      storageStats,
      recentLogs,
    ] = await Promise.all([
      this.getSystemStats(),
      this.getTimeRangeStats(30),
      this.getTopUsers(5),
      this.getStorageStatsByType(),
      this.logService.getAllLogs(20),
    ]);

    await this.logService.log({
      action: 'SYSTEM_BACKUP', // Utilisation comme action de rapport
      entity: 'SYSTEM',
      entityId: 'admin-report',
      userId,
      details: 'Génération du rapport administrateur',
    });

    return {
      systemStats,
      timeRangeStats,
      topUsers,
      storageStats,
      recentActivity: recentLogs,
      generatedAt: new Date(),
      generatedBy: userId,
    };
  }

  /**
   * Obtient les documents les plus volumineux
   */
  async getLargestDocuments(limit: number = 10) {
    return prisma.document.findMany({
      orderBy: { size: 'desc' },
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Obtient les documents les plus récents
   */
  async getRecentDocuments(limit: number = 10) {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
