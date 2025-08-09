import prisma from './database';

export type LogAction = 
  | 'USER_CREATE' 
  | 'USER_UPDATE' 
  | 'USER_DELETE' 
  | 'USER_LOGIN'
  | 'DOCUMENT_CREATE' 
  | 'DOCUMENT_UPDATE' 
  | 'DOCUMENT_DELETE' 
  | 'DOCUMENT_UPLOAD' 
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_FAVORITE'
  | 'DOCUMENT_UNFAVORITE';

export type LogEntity = 'USER' | 'DOCUMENT';

export interface LogData {
  action: LogAction;
  entity: LogEntity;
  entityId: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  documentId?: string;
}

export class LogService {
  async log(data: LogData): Promise<void> {
    try {
      await prisma.log.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          userId: data.userId,
          documentId: data.documentId,
        },
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du log:', error);
    }
  }

  async getUserLogs(userId: string, limit = 50) {
    return prisma.log.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        document: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }

  async getDocumentLogs(documentId: string, limit = 50) {
    return prisma.log.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        document: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }

  async getAllLogs(limit = 100, offset = 0) {
    return prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        document: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }

  async getLogsByAction(action: LogAction, limit = 50) {
    return prisma.log.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        document: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }

  async getUserLogsByEmail(userEmail: string, limit = 50) {
    return prisma.log.findMany({
      where: { 
        user: {
          email: userEmail
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        document: {
          select: { id: true, name: true, type: true }
        }
      }
    });
  }
}
