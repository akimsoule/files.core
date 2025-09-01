import prisma from './database';
import { encryptionService } from './encryptionService';

export interface UserMegaConfigData {
  email: string;
  password: string;
  isActive?: boolean;
}

export interface UserMegaConfigResponse {
  id: string;
  userId: string;
  email: string; // Email en clair pour affichage
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service de gestion des configurations MEGA par utilisateur
 */
export class UserMegaConfigService {
  
  /**
   * Crée ou met à jour la configuration MEGA d'un utilisateur
   */
  async upsertUserMegaConfig(userId: string, configData: UserMegaConfigData): Promise<UserMegaConfigResponse> {
    // Chiffrer les credentials
    const encryptedEmail = encryptionService.encrypt(configData.email);
    const encryptedPassword = encryptionService.encrypt(configData.password);

    const config = await prisma.userMegaConfig.upsert({
      where: { userId },
      update: {
        email: encryptedEmail,
        password: encryptedPassword,
        isActive: configData.isActive ?? true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        email: encryptedEmail,
        password: encryptedPassword,
        isActive: configData.isActive ?? true,
      },
    });

    return {
      id: config.id,
      userId: config.userId,
      email: configData.email, // Retourner l'email en clair pour l'affichage
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Récupère la configuration MEGA d'un utilisateur
   */
  async getUserMegaConfig(userId: string): Promise<UserMegaConfigResponse | null> {
    const config = await prisma.userMegaConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      return null;
    }

    try {
      const decryptedEmail = encryptionService.decrypt(config.email);
      
      return {
        id: config.id,
        userId: config.userId,
        email: decryptedEmail,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      console.error('Erreur lors du déchiffrement de la config MEGA:', error);
      return null;
    }
  }

  /**
   * Récupère les credentials MEGA déchiffrés d'un utilisateur pour utilisation interne
   */
  async getUserMegaCredentials(userId: string): Promise<{ email: string; password: string } | null> {
    const config = await prisma.userMegaConfig.findFirst({
      where: { 
        userId,
        isActive: true 
      },
    });

    if (!config) {
      return null;
    }

    try {
      const email = encryptionService.decrypt(config.email);
      const password = encryptionService.decrypt(config.password);
      
      return { email, password };
    } catch (error) {
      console.error('Erreur lors du déchiffrement des credentials MEGA:', error);
      return null;
    }
  }

  /**
   * Supprime la configuration MEGA d'un utilisateur
   */
  async deleteUserMegaConfig(userId: string): Promise<void> {
    await prisma.userMegaConfig.delete({
      where: { userId },
    });
  }

  /**
   * Active ou désactive la configuration MEGA d'un utilisateur
   */
  async toggleUserMegaConfig(userId: string, isActive: boolean): Promise<UserMegaConfigResponse | null> {
    const config = await prisma.userMegaConfig.update({
      where: { userId },
      data: { isActive, updatedAt: new Date() },
    });

    if (!config) {
      return null;
    }

    const decryptedEmail = encryptionService.decrypt(config.email);
    
    return {
      id: config.id,
      userId: config.userId,
      email: decryptedEmail,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Vérifie si un utilisateur a une configuration MEGA active
   */
  async hasActiveMegaConfig(userId: string): Promise<boolean> {
    const config = await prisma.userMegaConfig.findFirst({
      where: { 
        userId,
        isActive: true 
      },
    });

    return !!config;
  }
}

export const userMegaConfigService = new UserMegaConfigService();
