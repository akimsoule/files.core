
import prisma from "./database";
import { LogService } from "./logService";
import * as megaStorage from "./megaStorage";
import fs from "fs";
import path from "path";
import { MegaStorageService } from "./megaStorage";

export interface CreateDocumentData {
  name: string;
  type: string;
  category: string;
  description?: string;
  tags?: string; // Tags séparés par des virgules
  ownerId?: string;
  ownerEmail?: string;
  filePath?: string;
  file?: {
    name: string; // Nom du fichier
    buffer: Buffer; // Contenu du fichier
    mimeType: string; // Type MIME du fichier
  };
}

export interface UpdateDocumentData {
  name?: string;
  type?: string;
  category?: string;
  description?: string;
  tags?: string; // Tags séparés par des virgules
  isFavorite?: boolean;
}

export class DocumentService {
  private megaStorageService: megaStorage.MegaStorageService;
  private logService: LogService;

  constructor(megaStorageService: MegaStorageService, logService: LogService) {
    this.megaStorageService = megaStorageService;
    this.logService = logService;
  }

  async createDocument(data: CreateDocumentData) {
    return await prisma.$transaction(async (tx) => {
      let fileId = "";
      let fileSize = 0;

      // Résoudre l'ID utilisateur à partir de l'email si ownerId non fourni
      let ownerId = data.ownerId;
      if (!ownerId && data.ownerEmail) {
        const user = await tx.user.findUnique({
          where: { email: data.ownerEmail },
        });
        if (!user) {
          throw new Error(
            `Aucun utilisateur trouvé avec l'email: ${data.ownerEmail}`
          );
        }
        ownerId = user.id;
      }
      if (!ownerId) {
        throw new Error("ownerId ou ownerEmail requis pour créer un document");
      }

      // Upload du fichier vers MEGA si fourni
      if (data.filePath) {
        const resolvedPath = path.resolve(data.filePath);
        const name = path.basename(resolvedPath);
        const mimeType = this.megaStorageService.getMimeType(
          name.split(".").pop() || ""
        );
        const fileBuffer = fs.readFileSync(resolvedPath);
        fileId = await this.megaStorageService.uploadFile(
          name,
          mimeType,
          fileBuffer
        );
        fileSize = fileBuffer.length;
      } else if (data.file) {
        fileId = await this.megaStorageService.uploadFile(
          data.file.name,
          data.file.mimeType,
          data.file.buffer
        );
        fileSize = data.file.buffer.length;
      }

      const document = await tx.document.create({
        data: {
          name: data.name,
          type: data.type,
          category: data.category,
          size: fileSize,
          description: data.description,
          tags: data.tags
            ? (Array.isArray(data.tags) ? data.tags.join(",") : data.tags)
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .join(",")
            : "",
          fileId,
          ownerId: ownerId,
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
      });

      // Créer le log dans la même transaction
      await tx.log.create({
        data: {
          action: "DOCUMENT_CREATE",
          entity: "DOCUMENT",
          entityId: document.id,
          userId: ownerId,
          documentId: document.id,
          details: `Document créé: ${document.name} (${document.type})`,
        },
      });

      return document;
    });
  }

  async getDocumentById(id: string) {
    return prisma.document.findUnique({
      where: { id },
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

  async getDocumentByNameAndOwner(name: string, ownerEmail: string) {
    return prisma.document.findFirst({
      where: {
        name: name,
        owner: {
          email: ownerEmail,
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
    });
  }

  async getDocumentByIdPrefix(idPrefix: string) {
    // Rechercher le premier document dont l'ID commence par le préfixe donné
    const documents = await prisma.document.findMany({
      where: {
        id: {
          startsWith: idPrefix,
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
      take: 1, // Ne prendre que le premier résultat
    });

    return documents.length > 0 ? documents[0] : null;
  }

  async getAllDocuments(
    skip = 0,
    take = 20,
    filters?: {
      type?: string;
      category?: string;
      ownerId?: string;
      tags?: string[];
      search?: string;
    }
  ) {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.document.findMany({
      where,
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserDocuments(ownerId: string, skip = 0, take = 20) {
    return prisma.document.findMany({
      where: { ownerId },
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getFavoriteDocuments(ownerId: string) {
    return prisma.document.findMany({
      where: {
        ownerId,
        isFavorite: true,
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
      orderBy: { createdAt: "desc" },
    });
  }

  async updateDocument(id: string, data: UpdateDocumentData, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.update({
        where: { id },
        data: {
          ...data,
          tags: data.tags
            ? (Array.isArray(data.tags) ? data.tags.join(",") : data.tags)
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .join(",")
            : undefined,
          modifiedAt: new Date(),
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
      });

      // Créer le log dans la même transaction
      await tx.log.create({
        data: {
          action: "DOCUMENT_UPDATE",
          entity: "DOCUMENT",
          entityId: id,
          userId,
          documentId: id,
          details: `Document mis à jour: ${document.name} (${Object.keys(data).join(
            ", "
          )})`,
        },
      });

      return document;
    });
  }

  async toggleFavorite(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error("Document non trouvé");
      }

      const updated = await tx.document.update({
        where: { id },
        data: {
          isFavorite: !document.isFavorite,
          modifiedAt: new Date(),
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
      });

      // Créer le log dans la même transaction
      await tx.log.create({
        data: {
          action: updated.isFavorite ? "DOCUMENT_FAVORITE" : "DOCUMENT_UNFAVORITE",
          entity: "DOCUMENT",
          entityId: id,
          userId,
          documentId: id,
          details: `Document ${
            updated.isFavorite ? "ajouté aux" : "retiré des"
          } favoris: ${updated.name}`,
        },
      });

      return updated;
    });
  }

  async deleteDocument(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error("Document non trouvé");
      }

      // Enregistrer le log AVANT la suppression dans la même transaction
      await tx.log.create({
        data: {
          action: "DOCUMENT_DELETE",
          entity: "DOCUMENT",
          entityId: id,
          userId,
          documentId: id,
          details: `Document supprimé: ${document.name}`,
        },
      });

      // Suppression du document dans la base de données (dans la transaction)
      await tx.document.delete({
        where: { id },
      });

      // Suppression du fichier sur MEGA (en dehors de la transaction DB car service externe)
      if (document.fileId) {
        try {
          await this.megaStorageService.deleteFile(document.fileId);
        } catch (error) {
          console.error("Erreur lors de la suppression du fichier MEGA:", error);
          // Note: Ne pas faire échouer la transaction pour une erreur MEGA
        }
      }

      return { message: "Document supprimé avec succès" };
    });
  }

  async downloadDocument(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error("Document non trouvé");
      }

      if (!document.fileId) {
        throw new Error("Aucun fichier associé à ce document");
      }

      // Télécharger le fichier depuis MEGA (service externe)
      const fileBuffer = await this.megaStorageService.downloadFile(
        document.fileId
      );

      // Créer le log dans la transaction
      await tx.log.create({
        data: {
          action: "DOCUMENT_DOWNLOAD",
          entity: "DOCUMENT",
          entityId: id,
          userId,
          documentId: id,
          details: `Document téléchargé: ${document.name}`,
        },
      });

      return {
        buffer: fileBuffer,
        filename: document.name,
        mimeType: this.getMimeTypeFromExtension(document.type),
      };
    });
  }

  async getDocumentUrl(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error("Document non trouvé");
      }

      if (!document.fileId) {
        throw new Error("Aucun fichier associé à ce document");
      }

      // Obtenir l'URL depuis MEGA (service externe)
      const url = await this.megaStorageService.getFileUrl(document.fileId);

      // Créer le log dans la transaction
      await tx.log.create({
        data: {
          action: "DOCUMENT_DOWNLOAD",
          entity: "DOCUMENT",
          entityId: id,
          userId,
          documentId: id,
          details: `URL temporaire générée pour: ${document.name}`,
        },
      });

      return { url, expiresIn: "1 heure" };
    });
  }

  async getDocumentStats() {
    const stats = await prisma.document.groupBy({
      by: ["type", "category"],
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    });

    const totalDocuments = await prisma.document.count();
    const totalSize = await prisma.document.aggregate({
      _sum: { size: true },
    });

    return {
      totalDocuments,
      totalSize: totalSize._sum.size || 0,
      byTypeAndCategory: stats,
    };
  }

  private getMimeTypeFromExtension(type: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };

    return mimeTypes[type.toLowerCase()] || "application/octet-stream";
  }
}
