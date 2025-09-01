import prisma from './database';
import { LogService } from './logService';

export interface SearchFilters {
  query?: string;
  tags?: string[];
  tag?: string; // Pour la compatibilité avec l'API
  type?: string;
  ownerId?: string;
  ownerEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sizeMin?: number;
  sizeMax?: number;
  isFavorite?: boolean;
  sortBy?: 'name' | 'date' | 'size' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  documents: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    description?: string | null;
    tags: string;
    fileId: string;
    hash: string;
    ownerId: string;
    isFavorite: boolean;
    createdAt: Date;
    modifiedAt: Date;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  totalCount: number;
  filters: SearchFilters;
  searchTime: number;
  suggestions?: string[];
}

export interface SearchSuggestion {
  type: 'document' | 'tag' | 'user';
  value: string;
  count: number;
}

export interface SearchAnalytics {
  popularQueries: { query: string; count: number; lastUsed: Date }[];
  commonFilters: { filter: string; value: string; count: number }[];
  searchTrends: { date: Date; searchCount: number }[];
}

export class SearchService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Recherche avancée de documents
   */
  async searchDocuments(filters: SearchFilters, userId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    const {
      query,
      tags,
      tag,
      type,
      ownerId,
      ownerEmail,
      dateFrom,
      dateTo,
      sizeMin,
      sizeMax,
      isFavorite,
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    const where: import('@prisma/client').Prisma.DocumentWhereInput = {};

    // Recherche textuelle dans le nom et la description
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
        { tags: { contains: query, mode: 'insensitive' as const } },
      ];
    }

    // Filtres spécifiques
    if (tag) {
      where.tags = { contains: tag, mode: 'insensitive' as const };
    } else if (tags && tags.length > 0) {
      where.AND = tags.map(t => ({
        tags: { contains: t, mode: 'insensitive' as const }
      }));
    } else {
      // PAR DÉFAUT : exclure les documents archivés si aucun tag spécifique n'est demandé
      where.NOT = {
        tags: { contains: "archived" }
      };
    }
    
    if (type) where.type = type;
    if (ownerId) where.ownerId = ownerId;
    if (isFavorite !== undefined) where.isFavorite = isFavorite;

    // Filtres de date
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Filtres de taille
    if (sizeMin || sizeMax) {
      where.size = {};
      if (sizeMin) where.size.gte = sizeMin;
      if (sizeMax) where.size.lte = sizeMax;
    }

    // Filtre par email du propriétaire
    if (ownerEmail) {
      where.owner = { email: { equals: ownerEmail, mode: 'insensitive' as const } };
    }

    // Ordre de tri
    let orderBy: import('@prisma/client').Prisma.DocumentOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'name') orderBy = { name: sortOrder };
    else if (sortBy === 'date') orderBy = { createdAt: sortOrder };
    else if (sortBy === 'size') orderBy = { size: sortOrder };
    // Note: le tri par category a été supprimé car cette propriété n'existe plus

    // Exécution de la recherche
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    const searchTime = Date.now() - startTime;

    // Log de la recherche
    if (userId) {
      await this.logService.log({
        action: 'SEARCH_PERFORM',
        entity: 'SYSTEM',
        entityId: 'search',
        userId,
        details: `Recherche: "${query || 'filtres avancés'}" - ${totalCount} résultats en ${searchTime}ms`,
      });
    }

    return {
      documents,
      totalCount,
      filters,
      searchTime,
      suggestions: await this.generateSuggestions(query),
    };
  }

  /**
   * Recherche rapide par nom de fichier
   */
  async quickSearch(query: string, userId?: string, limit: number = 10) {
    const documents = await prisma.document.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive' as const,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (userId) {
      await this.logService.log({
        action: 'SEARCH_PERFORM',
        entity: 'SYSTEM',
        entityId: 'quick-search',
        userId,
        details: `Recherche rapide: "${query}" - ${documents.length} résultats`,
      });
    }

    return documents;
  }

  /**
   * Recherche de documents similaires basée sur les tags
   */
  async findSimilarDocuments(documentId: string, limit: number = 5) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { 
        tags: true, 
        type: true,
        ownerId: true,
      },
    });

    if (!document) {
      throw new Error('Document non trouvé');
    }

    const tags = document.tags ? document.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    const similar = await prisma.document.findMany({
      where: {
        id: { not: documentId },
        OR: [
          { type: document.type },
          ...(tags.length > 0 ? tags.map(tag => ({
            tags: { contains: tag, mode: 'insensitive' as const }
          })) : []),
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return similar;
  }

  /**
   * Génère des suggestions de recherche
   */
  private async generateSuggestions(query?: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const suggestions = new Set<string>();

    // Suggestions basées sur les noms de documents
    const documents = await prisma.document.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive' as const,
        },
      },
      select: { name: true },
      take: 10,
    });

    documents.forEach(doc => {
      const words = doc.name.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.includes(query.toLowerCase()) && word.length > query.length) {
          suggestions.add(word);
        }
      });
    });

    // Suggestions basées sur les tags
    const allDocuments = await prisma.document.findMany({
      select: { tags: true },
      where: {
        tags: {
          contains: query,
          mode: 'insensitive' as const,
        },
      },
      take: 20,
    });

    allDocuments.forEach(doc => {
      if (doc.tags) {
        const tags = doc.tags.split(',').map(t => t.trim());
        tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase()) && tag.length > query.length) {
            suggestions.add(tag);
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }

  /**
   * Obtient les suggestions de recherche par type
   */
  async getSearchSuggestions(query: string, type?: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    if (!type || type === 'document') {
      const documents = await prisma.document.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive' as const,
          },
        },
        select: { name: true },
        take: 5,
      });

      documents.forEach(doc => {
        suggestions.push({
          type: 'document',
          value: doc.name,
          count: 1,
        });
      });
    }

    if (!type || type === 'tag') {
      // Recherche de tags - on collecte tous les tags uniques qui contiennent la query
      const documents = await prisma.document.findMany({
        where: {
          tags: {
            contains: query,
            mode: 'insensitive' as const,
          },
        },
        select: { tags: true },
        take: 100, // On prend plus de documents pour extraire les tags
      });

      const tagCounts = new Map<string, number>();
      
      documents.forEach(doc => {
        if (doc.tags) {
          const docTags = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
          docTags.forEach(tag => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
          });
        }
      });

      // Convertir en suggestions et trier par fréquence
      Array.from(tagCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([tag, count]) => {
          suggestions.push({
            type: 'tag',
            value: tag,
            count,
          });
        });
    }

    return suggestions;
  }

  /**
   * Recherche avancée avec scoring de pertinence
   */
  async searchWithRelevanceScoring(query: string, filters?: Partial<SearchFilters>, userId?: string) {
    const allDocuments = await this.searchDocuments({
      query,
      ...filters,
      limit: 100, // Récupérer plus de résultats pour le scoring
    }, userId);

    // Calcul du score de pertinence
    const scoredDocuments = allDocuments.documents.map(doc => {
      let score = 0;
      const queryLower = query.toLowerCase();

      // Score basé sur le nom (poids le plus élevé)
      if (doc.name.toLowerCase().includes(queryLower)) {
        score += 10;
        if (doc.name.toLowerCase().startsWith(queryLower)) {
          score += 5; // Bonus pour correspondance au début
        }
      }

      // Score basé sur la description
      if (doc.description && doc.description.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Score basé sur les tags
      if (doc.tags) {
        const tags = doc.tags.split(',').map(t => t.trim().toLowerCase());
        tags.forEach(tag => {
          if (tag.includes(queryLower)) {
            score += 3;
            if (tag === queryLower) {
              score += 2; // Bonus pour correspondance exacte
            }
          }
        });
      }

      // Bonus pour les favoris
      if (doc.isFavorite) {
        score += 1;
      }

      // Bonus pour les documents récents
      const daysSinceCreation = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) {
        score += 1;
      }

      return { ...doc, relevanceScore: score };
    });

    // Tri par score de pertinence
    scoredDocuments.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      ...allDocuments,
      documents: scoredDocuments.slice(0, filters?.limit || 20),
    };
  }

  /**
   * Sauvegarde une recherche pour un utilisateur
   */
  async saveSearch(userId: string, name: string, filters: SearchFilters) {
    // Pour l'instant, on log juste la recherche sauvegardée
    await this.logService.log({
      action: 'SEARCH_PERFORM',
      entity: 'SYSTEM',
      entityId: 'saved-search',
      userId,
      details: `Recherche sauvegardée: "${name}" avec filtres: ${JSON.stringify(filters)}`,
    });

    return {
      message: 'Recherche sauvegardée avec succès',
      name,
      filters,
    };
  }

  /**
   * Recherche de texte complet dans le contenu des documents (si implémenté)
   */
  async fullTextSearch(query: string, userId?: string) {
    // Pour l'instant, recherche dans les métadonnées seulement
    // Dans une implémentation future, on pourrait indexer le contenu des fichiers
    return this.searchDocuments({
      query,
      sortBy: 'relevance',
    }, userId);
  }
}
