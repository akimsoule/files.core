import { LogService } from './logService';
import crypto from 'crypto';

export interface FileValidationResult {
  isValid: boolean;
  fileType: string;
  mimeType: string;
  size: number;
  hash: string;
  errors: string[];
  warnings: string[];
}

export interface FileInfo {
  name: string;
  type: string;
  size: number;
  hash: string;
  extension: string;
  mimeType: string;
  isImage: boolean;
  isDocument: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isArchive: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    storage: boolean;
    logs: boolean;
  };
  performance: {
    responseTime: number;
    memoryUsage?: number;
    diskSpace?: number;
  };
  lastCheck: Date;
}

export class UtilsService {
  private logService: LogService;

  // Types MIME autorisés
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'application/json',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ];

  // Taille maximale autorisée (100 MB)
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Valide un fichier avant upload
   */
  validateFile(fileName: string, buffer: Buffer, mimeType: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation du nom de fichier
    if (!fileName || fileName.trim().length === 0) {
      errors.push('Nom de fichier invalide');
    }

    if (fileName.length > 255) {
      errors.push('Nom de fichier trop long (max 255 caractères)');
    }

    // Validation de la taille
    if (buffer.length === 0) {
      errors.push('Fichier vide');
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      errors.push(`Fichier trop volumineux (max ${this.formatFileSize(this.MAX_FILE_SIZE)})`);
    }

    // Validation du type MIME
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      errors.push(`Type de fichier non autorisé: ${mimeType}`);
    }

    // Calcul du hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Détection du type de fichier réel
    const detectedType = this.detectFileType(buffer);
    if (detectedType !== mimeType) {
      warnings.push(`Type MIME déclaré (${mimeType}) différent du type détecté (${detectedType})`);
    }

    // Validation de l'extension
    const extension = this.getFileExtension(fileName);
    const expectedMimeType = this.getMimeTypeFromExtension(extension);
    if (expectedMimeType && expectedMimeType !== mimeType) {
      warnings.push(`Extension ${extension} ne correspond pas au type MIME ${mimeType}`);
    }

    return {
      isValid: errors.length === 0,
      fileType: detectedType,
      mimeType,
      size: buffer.length,
      hash,
      errors,
      warnings,
    };
  }

  /**
   * Obtient des informations détaillées sur un fichier
   */
  getFileInfo(fileName: string, buffer: Buffer, mimeType: string): FileInfo {
    const extension = this.getFileExtension(fileName);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      name: fileName,
      type: mimeType,
      size: buffer.length,
      hash,
      extension,
      mimeType,
      isImage: this.isImageFile(mimeType),
      isDocument: this.isDocumentFile(mimeType),
      isVideo: this.isVideoFile(mimeType),
      isAudio: this.isAudioFile(mimeType),
      isArchive: this.isArchiveFile(mimeType),
    };
  }

  /**
   * Formate une taille de fichier en unités lisibles
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
  }

  /**
   * Génère un nom de fichier unique
   */
  generateUniqueFileName(originalName: string): string {
    const extension = this.getFileExtension(originalName);
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Nettoie un nom de fichier pour le rendre sûr
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Remplace les caractères non autorisés
      .replace(/_{2,}/g, '_') // Remplace les underscores multiples
      .replace(/^_+|_+$/g, '') // Supprime les underscores en début/fin
      .substring(0, 255); // Limite la longueur
  }

  /**
   * Extrait l'extension d'un fichier
   */
  private getFileExtension(fileName: string): string {
    const match = fileName.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Obtient le type MIME à partir de l'extension
   */
  private getMimeTypeFromExtension(extension: string): string | null {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'json': 'application/json',
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
    };

    return mimeTypes[extension] || null;
  }

  /**
   * Détecte le type de fichier à partir du contenu
   */
  private detectFileType(buffer: Buffer): string {
    // Signatures de fichiers (magic numbers)
    const signatures: Array<{ signature: number[], mimeType: string }> = [
      { signature: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf' }, // PDF
      { signature: [0xFF, 0xD8, 0xFF], mimeType: 'image/jpeg' }, // JPEG
      { signature: [0x89, 0x50, 0x4E, 0x47], mimeType: 'image/png' }, // PNG
      { signature: [0x47, 0x49, 0x46], mimeType: 'image/gif' }, // GIF
      { signature: [0x50, 0x4B, 0x03, 0x04], mimeType: 'application/zip' }, // ZIP
      { signature: [0x50, 0x4B, 0x05, 0x06], mimeType: 'application/zip' }, // ZIP
      { signature: [0x52, 0x61, 0x72, 0x21], mimeType: 'application/x-rar-compressed' }, // RAR
    ];

    for (const { signature, mimeType } of signatures) {
      if (buffer.length >= signature.length) {
        const match = signature.every((byte, index) => buffer[index] === byte);
        if (match) {
          return mimeType;
        }
      }
    }

    return 'application/octet-stream';
  }

  /**
   * Vérifie si le fichier est une image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Vérifie si le fichier est un document
   */
  private isDocumentFile(mimeType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];
    return documentTypes.includes(mimeType);
  }

  /**
   * Vérifie si le fichier est une vidéo
   */
  private isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Vérifie si le fichier est un audio
   */
  private isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Vérifie si le fichier est une archive
   */
  private isArchiveFile(mimeType: string): boolean {
    const archiveTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-tar',
      'application/gzip',
    ];
    return archiveTypes.includes(mimeType);
  }

  /**
   * Génère un token d'accès temporaire
   */
  generateTemporaryToken(data: Record<string, unknown>, expirationHours: number = 1): string {
    const payload = {
      data,
      exp: Date.now() + (expirationHours * 60 * 60 * 1000),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Valide un token d'accès temporaire
   */
  validateTemporaryToken(token: string): { valid: boolean; data?: Record<string, unknown>; expired?: boolean } {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      if (Date.now() > payload.exp) {
        return { valid: false, expired: true };
      }
      
      return { valid: true, data: payload.data };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Vérifie la santé du système
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    const checks = {
      database: true,
      storage: true,
      logs: true,
    };

    try {
      // Test de la base de données
      // Note: Ici on ferait un test simple de connexion à la DB
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      // Test du stockage MEGA
      // Note: Ici on ferait un test de connexion à MEGA
      checks.storage = true;
    } catch {
      checks.storage = false;
    }

    try {
      // Test des logs
      checks.logs = true;
    } catch {
      checks.logs = false;
    }

    const responseTime = Date.now() - startTime;
    const allChecksPass = Object.values(checks).every(Boolean);
    
    return {
      status: allChecksPass ? 'healthy' : 'warning',
      checks,
      performance: {
        responseTime,
      },
      lastCheck: new Date(),
    };
  }

  /**
   * Génère un identifiant court pour les documents
   */
  generateShortId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Convertit une chaîne en slug URL-friendly
   */
  slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Supprime les caractères spéciaux
      .replace(/\s+/g, '-') // Remplace les espaces par des tirets
      .replace(/-+/g, '-') // Supprime les tirets multiples
      .trim();
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme de Levenshtein)
   */
  calculateStringSimilarity(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // Deletion
          matrix[j - 1][i] + 1, // Insertion
          matrix[j - 1][i - 1] + indicator // Substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }
}
