import prisma from './database';
import { LogService } from './logService';

export interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
  parentId?: string; // ID du dossier parent (optionnel pour les dossiers racine)
  ownerId: string;
}

export interface UpdateFolderData {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
}

export interface FolderWithCounts {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  folderCount: number;
  totalSize: number;
  parent?: {
    id: string;
    name: string;
  };
  children?: FolderWithCounts[];
}

export class FolderService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Crée un nouveau dossier
   */
  async createFolder(data: CreateFolderData) {
    // Vérifier que le nom n'est pas vide
    if (!data.name.trim()) {
      throw new Error('Le nom du dossier est requis');
    }

    // Vérifier que le dossier parent existe (si spécifié)
    if (data.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: data.parentId,
          ownerId: data.ownerId, // S'assurer que l'utilisateur possède le dossier parent
        },
      });

      if (!parentFolder) {
        throw new Error('Dossier parent non trouvé ou accès non autorisé');
      }
    }

    // Vérifier qu'un dossier avec le même nom n'existe pas déjà dans le même parent
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: data.name,
        ownerId: data.ownerId,
        parentId: data.parentId,
      },
    });

    if (existingFolder) {
      throw new Error('Un dossier avec ce nom existe déjà dans ce répertoire');
    }

    const folder = await prisma.folder.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
        color: data.color || '#3B82F6',
        parentId: data.parentId,
        ownerId: data.ownerId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
    });

    // Log de la création
    await this.logService.log({
      action: 'CREATE',
      entity: 'FOLDER',
      entityId: folder.id,
      userId: data.ownerId,
      details: `Dossier créé: "${folder.name}"${data.parentId ? ` dans "${folder.parent?.name}"` : ' à la racine'}`,
    });

    return folder;
  }

  /**
   * Récupère un dossier par son ID
   */
  async getFolderById(id: string, userId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        ownerId: userId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          include: {
            _count: {
              select: {
                children: true,
                documents: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
    });

    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    return folder;
  }

  /**
   * Récupère tous les dossiers racine d'un utilisateur
   */
  async getRootFolders(userId: string): Promise<FolderWithCounts[]> {
    const folders = await prisma.folder.findMany({
      where: {
        ownerId: userId,
        parentId: null, // Dossiers racine uniquement
      },
      include: {
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
        documents: {
          select: {
            size: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description || undefined,
      color: folder.color || undefined,
      parentId: folder.parentId || undefined,
      ownerId: folder.ownerId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      documentCount: folder._count.documents,
      folderCount: folder._count.children,
      totalSize: folder.documents.reduce((sum, doc) => sum + doc.size, 0),
    }));
  }

  /**
   * Récupère les sous-dossiers d'un dossier
   */
  async getSubfolders(parentId: string, userId: string): Promise<FolderWithCounts[]> {
    const folders = await prisma.folder.findMany({
      where: {
        parentId,
        ownerId: userId,
      },
      include: {
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
        documents: {
          select: {
            size: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description || undefined,
      color: folder.color || undefined,
      parentId: folder.parentId || undefined,
      ownerId: folder.ownerId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      documentCount: folder._count.documents,
      folderCount: folder._count.children,
      totalSize: folder.documents.reduce((sum, doc) => sum + doc.size, 0),
    }));
  }

  /**
   * Met à jour un dossier
   */
  async updateFolder(id: string, data: UpdateFolderData, userId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    // Vérifier que le nom n'est pas vide si fourni
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Le nom du dossier ne peut pas être vide');
    }

    // Vérifier que le dossier parent existe (si changé)
    if (data.parentId !== undefined && data.parentId !== folder.parentId) {
      if (data.parentId) {
        const parentFolder = await prisma.folder.findFirst({
          where: {
            id: data.parentId,
            ownerId: userId,
          },
        });

        if (!parentFolder) {
          throw new Error('Dossier parent non trouvé');
        }

        // Vérifier qu'on ne crée pas une boucle (le parent ne peut pas être un descendant)
        if (await this.isDescendant(id, data.parentId)) {
          throw new Error('Impossible de déplacer un dossier dans un de ses sous-dossiers');
        }
      }

      // Vérifier l'unicité du nom dans le nouveau parent
      if (data.name) {
        const existingFolder = await prisma.folder.findFirst({
          where: {
            name: data.name,
            ownerId: userId,
            parentId: data.parentId,
            NOT: { id }, // Exclure le dossier actuel
          },
        });

        if (existingFolder) {
          throw new Error('Un dossier avec ce nom existe déjà dans ce répertoire');
        }
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.color && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
    });

    // Log de la mise à jour
    await this.logService.log({
      action: 'UPDATE',
      entity: 'FOLDER',
      entityId: id,
      userId,
      details: `Dossier mis à jour: "${updatedFolder.name}"`,
    });

    return updatedFolder;
  }

  /**
   * Supprime un dossier
   */
  async deleteFolder(id: string, userId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        ownerId: userId,
      },
      include: {
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
    });

    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    // Vérifier que le dossier est vide
    if (folder._count.children > 0 || folder._count.documents > 0) {
      throw new Error('Impossible de supprimer un dossier non vide');
    }

    await prisma.folder.delete({
      where: { id },
    });

    // Log de la suppression
    await this.logService.log({
      action: 'DELETE',
      entity: 'FOLDER',
      entityId: id,
      userId,
      details: `Dossier supprimé: "${folder.name}"`,
    });

    return { success: true };
  }

  /**
   * Déplace un document vers un dossier
   */
  async moveDocumentToFolder(documentId: string, folderId: string | null, userId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerId: userId,
      },
    });

    if (!document) {
      throw new Error('Document non trouvé');
    }

    // Vérifier que le dossier de destination existe (si spécifié)
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          ownerId: userId,
        },
      });

      if (!folder) {
        throw new Error('Dossier de destination non trouvé');
      }
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { folderId },
    });

    // Log du déplacement
    await this.logService.log({
      action: 'MOVE',
      entity: 'DOCUMENT',
      entityId: documentId,
      userId,
      details: `Document "${document.name}" déplacé ${folderId ? `vers le dossier` : 'vers la racine'}`,
    });

    return updatedDocument;
  }

  /**
   * Obtient le chemin complet d'un dossier
   */
  async getFolderPath(folderId: string, userId: string): Promise<string> {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        ownerId: userId,
      },
      include: {
        parent: true,
      },
    });

    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    if (!folder.parent) {
      return folder.name;
    }

    const parentPath = await this.getFolderPath(folder.parent.id, userId);
    return `${parentPath}/${folder.name}`;
  }

  /**
   * Vérifie si un dossier est un descendant d'un autre
   */
  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    if (ancestorId === descendantId) {
      return true;
    }

    const descendant = await prisma.folder.findUnique({
      where: { id: descendantId },
      select: { parentId: true },
    });

    if (!descendant || !descendant.parentId) {
      return false;
    }

    return this.isDescendant(ancestorId, descendant.parentId);
  }
}
