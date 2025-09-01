import bcrypt from 'bcryptjs';
import { LogService } from './logService';
import prisma from './database';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
}

export class UserService {

  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  async createUser(data: CreateUserData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    await this.logService.log({
      action: 'USER_CREATE',
      entity: 'USER',
      entityId: user.id,
      userId: user.id,
      details: `Utilisateur créé: ${user.email}`,
    });

    return user;
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true,
          }
        }
      }
    });
  }

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async getAllUsers(skip = 0, take = 20) {
    return prisma.user.findMany({
      skip,
      take,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUser(id: string, data: UpdateUserData) {
  const updateData: Partial<{ name: string; email: string; passwordHash: string }> = {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    await this.logService.log({
      action: 'USER_UPDATE',
      entity: 'USER',
      entityId: id,
      userId: id,
      details: `Utilisateur mis à jour: ${Object.keys(updateData).join(', ')}`,
    });

    return user;
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { documents: true }
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Enregistrer le log AVANT la suppression pour éviter les violations de contrainte
    await this.logService.log({
      action: 'USER_DELETE',
      entity: 'USER',
      entityId: id,
      details: `Utilisateur supprimé: ${user.email} (${user.documents.length} documents supprimés)`,
    });

    // Suppression des documents associés
    await prisma.document.deleteMany({
      where: { ownerId: id }
    });

    // Suppression de l'utilisateur
    await prisma.user.delete({
      where: { id }
    });

    return { message: 'Utilisateur et ses documents supprimés avec succès' };
  }

  async verifyPassword(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    await this.logService.log({
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      userId: user.id,
      details: `Connexion réussie: ${user.email}`,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
