import prisma from "./database";
import { LogService } from "./logService";
import * as megaStorage from "./megaStorage";
import fs from "fs";
import path from "path";
import { MegaStorageService } from "./megaStorage";
import crypto from "crypto";

export interface CreateDocumentData {
  name: string;
  type: string;
  category: string;
  description?: string;
  tags?: string; // Tags séparés par des virgules
  ownerId?: string;
  ownerEmail?: string;
  filePath?: string;
  testFolderId?: string; // ID du dossier MEGA pour les tests
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
    let fileId = "";
    let fileSize = 0;
    let fileBuffer: Buffer | undefined;

    // Résoudre l'ID utilisateur à partir de l'email si ownerId non fourni
    let ownerId = data.ownerId;
    if (!ownerId && data.ownerEmail) {
      const user = await prisma.user.findUnique({
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
      fileBuffer = fs.readFileSync(resolvedPath);
      fileId = await this.megaStorageService.uploadFile(
        name,
        mimeType,
        fileBuffer,
        data.testFolderId
      );
      fileSize = fileBuffer.length;
    } else if (data.file) {
      fileBuffer = data.file.buffer;
      fileId = await this.megaStorageService.uploadFile(
        data.file.name,
        data.file.mimeType,
        fileBuffer,
        data.testFolderId
      );
      fileSize = fileBuffer.length;
    }

    if (!fileBuffer) {
      throw new Error("Aucun contenu de fichier fourni pour créer le document.");
    }

    // Calculer le hash du fichier
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const document = await prisma.document.create({
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
        hash, // Ajout du hash
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

    await this.logService.log({
      action: "DOCUMENT_CREATE",
      entity: "DOCUMENT",
      entityId: document.id,
      userId: ownerId,
      documentId: document.id,
      details: `Document créé: ${document.name} (${document.type})`,
    });

    return document;
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
    const document = await prisma.document.update({
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

    await this.logService.log({
      action: "DOCUMENT_UPDATE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document mis à jour: ${document.name} (${Object.keys(data).join(
        ", "
      )})`,
    });

    return document;
  }

  async toggleFavorite(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    const updated = await prisma.document.update({
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

    await this.logService.log({
      action: updated.isFavorite ? "DOCUMENT_FAVORITE" : "DOCUMENT_UNFAVORITE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document ${
        updated.isFavorite ? "ajouté aux" : "retiré des"
      } favoris: ${updated.name}`,
    });

    return updated;
  }

  async deleteDocument(id: string, userId: string, folderId?: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    // Enregistrer le log AVANT la suppression pour éviter les violations de contrainte
    await this.logService.log({
      action: "DOCUMENT_DELETE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document supprimé: ${document.name}`,
    });

    // Suppression du fichier sur MEGA
    if (document.fileId) {
      try {
        await this.megaStorageService.deleteFile(document.fileId, folderId);
        console.log(`🗑️ Fichier MEGA supprimé: ${document.fileId}`);
      } catch (error) {
        console.warn(`⚠️ Impossible de supprimer le fichier MEGA (${document.fileId}): ${error instanceof Error ? error.message : error}`);
        console.warn(`💡 Le document sera supprimé de la base de données même si le fichier MEGA est inaccessible.`);
      }
    }

    // Suppression du document dans la base de données
    await prisma.document.delete({
      where: { id },
    });

    return { message: "Document supprimé avec succès" };
  }

  async downloadDocument(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    if (!document.fileId) {
      throw new Error("Aucun fichier associé à ce document");
    }

    const fileBuffer = await this.megaStorageService.downloadFile(
      document.fileId
    );

    await this.logService.log({
      action: "DOCUMENT_DOWNLOAD",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document téléchargé: ${document.name}`,
    });

    return {
      buffer: fileBuffer,
      filename: document.name,
      mimeType: this.getMimeTypeFromExtension(document.type),
    };
  }

  async getDocumentUrl(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    if (!document.fileId) {
      throw new Error("Aucun fichier associé à ce document");
    }

    const url = await this.megaStorageService.getFileUrl(document.fileId);

    await this.logService.log({
      action: "DOCUMENT_DOWNLOAD",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `URL temporaire générée pour: ${document.name}`,
    });

    return { url, expiresIn: "1 heure" };
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

  /**
   * Synchronise les fichiers de MEGA avec la base de données.
   * Les fichiers existants dans MEGA mais absents de la DB sont ajoutés.
   * @param defaultOwnerId - L'ID de l'utilisateur propriétaire par défaut pour les nouveaux documents.
   * @param folderId - ID du dossier MEGA à synchroniser (optionnel, par défaut tout le compte)
   */
  async synchronizeMegaFiles(defaultOwnerId: string, folderId?: string) {
    console.log(`🔄 Démarrage de la synchronisation des fichiers MEGA${folderId ? ' (dossier spécifique)' : ' (compte complet)'}...`);
    const megaFiles = await this.megaStorageService.getAllFilesWithContent(folderId);
    console.log(`🔍 ${megaFiles.length} fichiers trouvés sur MEGA.`);

    const allDocuments = await prisma.document.findMany({ select: { id: true, hash: true, name: true } });
    console.log(`📄 ${allDocuments.length} documents trouvés dans la base de données.`);

    const newDocuments = [];
    const updatedDocuments = [];

    for (const megaFile of megaFiles) {
      const hash = crypto.createHash('sha256').update(megaFile.buffer).digest('hex');
      console.log(`   - Traitement du fichier: ${megaFile.name} (hash: ${hash.substring(0, 12)}...)`);

      // Chercher si un document avec ce hash existe déjà
      const existingDocument = allDocuments.find(doc => doc.hash === hash);

      if (existingDocument) {
        console.log(`   🔄 Document existant trouvé: ${existingDocument.name}. Mise à jour...`);
        
        // Mise à jour du document existant
        const updatedDocument = await prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            name: megaFile.name, // Mettre à jour le nom si il a changé
            fileId: megaFile.fileId, // Mettre à jour le fileId MEGA
            modifiedAt: new Date(),
          },
        });

        await this.logService.log({
          action: 'DOCUMENT_SYNC',
          entity: 'DOCUMENT',
          entityId: existingDocument.id,
          userId: defaultOwnerId,
          details: `Document mis à jour lors de la synchronisation MEGA: ${megaFile.name}`,
        });

        updatedDocuments.push(updatedDocument);
      } else {
        console.log(`   ✨ Nouveau fichier détecté: ${megaFile.name}. Ajout à la base de données...`);
        
        // Création d'un nouveau document
        const fileExt = megaFile.name.split('.').pop() || 'bin';
        
        const document = await prisma.document.create({
          data: {
            name: megaFile.name,
            type: fileExt,
            category: 'synced',
            size: megaFile.buffer.length,
            description: 'Document synchronisé depuis MEGA',
            tags: 'synced',
            fileId: megaFile.fileId,
            hash: hash,
            ownerId: defaultOwnerId,
          },
        });

        await this.logService.log({
          action: 'DOCUMENT_SYNC',
          entity: 'DOCUMENT',
          entityId: document.id,
          userId: defaultOwnerId,
          details: `Nouveau document synchronisé depuis MEGA: ${document.name}`,
        });

        newDocuments.push(document as any);
      }
    }

    console.log(`🎉 Synchronisation terminée. ${newDocuments.length} nouveau(x) document(s) ajouté(s), ${updatedDocuments.length} document(s) mis à jour.`);
    return {
      syncedCount: newDocuments.length,
      updatedCount: updatedDocuments.length,
      newDocuments,
      updatedDocuments,
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
