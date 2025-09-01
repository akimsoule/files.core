import * as crypto from 'crypto';

/**
 * Service de chiffrement pour les données sensibles (credentials MEGA)
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || this.generateDefaultKey();
    if (!process.env.ENCRYPTION_SECRET_KEY) {
      console.warn('⚠️ ENCRYPTION_SECRET_KEY non définie. Utilisation d\'une clé par défaut (non recommandé en production)');
    }
  }

  private generateDefaultKey(): string {
    // Génère une clé par défaut basée sur d'autres variables d'environnement
    const base = process.env.JWT_SECRET || 'default-secret';
    return crypto.createHash('sha256').update(base + 'mega-encryption').digest('hex');
  }

  /**
   * Chiffre une chaîne de caractères
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey, 'hex').subarray(0, 32), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Retourne IV + AuthTag + Données chiffrées
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffre une chaîne de caractères
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Format de données chiffrées invalide');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.secretKey, 'hex').subarray(0, 32), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Vérifie si une donnée est chiffrée (format attendu)
   */
  isEncrypted(data: string): boolean {
    return data.includes(':') && data.split(':').length === 3;
  }
}

export const encryptionService = new EncryptionService();
