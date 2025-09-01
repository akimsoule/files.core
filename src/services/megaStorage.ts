import { Storage, verify } from 'megajs';
import { userMegaConfigService } from './userMegaConfigService';

/**
 * Service de gestion des fichiers sur MEGA avec support multi-utilisateur
 */
export class MegaStorageService {
  private storageCache = new Map<string, Storage>();
  private defaultEmail = process.env.MEGA_EMAIL;
  private defaultPassword = process.env.MEGA_PASSWORD;

  /**
   * Initialise la connexion MEGA pour un utilisateur spécifique
   */
  private async getStorage(userId?: string): Promise<Storage> {
    let storageKey = 'default';
    let email = this.defaultEmail;
    let password = this.defaultPassword;

    // Si un userId est fourni, utiliser sa configuration
    if (userId) {
      const credentials = await userMegaConfigService.getUserMegaCredentials(userId);
      if (credentials) {
        storageKey = userId;
        email = credentials.email;
        password = credentials.password;
      }
    }

    // Vérifier le cache
    if (this.storageCache.has(storageKey)) {
      return this.storageCache.get(storageKey)!;
    }

    // Vérifier que les credentials sont disponibles
    if (!email || !password) {
      throw new Error('Identifiants MEGA requis - configurez votre compte MEGA dans vos paramètres');
    }

    try {
      const storage = await new Storage({ 
        email, 
        password 
      }).ready;
      
      this.storageCache.set(storageKey, storage);
      return storage;
    } catch (error) {
      throw new Error(`Erreur de connexion MEGA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère une URL de téléchargement temporaire pour un fichier
   * @param fileId - L'ID du fichier sur MEGA
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Une URL temporaire valide pendant 1 heure
   */
  async getFileUrl(fileId: string, userId?: string): Promise<string> {
    const storage = await this.getStorage(userId);
    const file = storage.find(f => f.nodeId === fileId);
    if (!file) throw new Error('Fichier non trouvé');
    
    // Génère une URL temporaire valide pendant 1 heure
    return await file.link({
      // noExpire: false,
      // expiry: 3600 // 1 heure
    });
  }

  /**
   * Génère une URL data base64 pour un fichier
   * @param fileId - L'ID du fichier sur MEGA
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Une URL data en base64
   */
  async getBase64FileUrl(fileId: string, userId?: string): Promise<string> {
    const storage = await this.getStorage(userId);
    const file = storage.find(f => f.nodeId === fileId);
    if (!file) throw new Error('Fichier non trouvé');

    // Déterminer le type MIME en fonction de l'extension du fichier
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const mimeType = this.getMimeType(ext || '');

    // Télécharger et convertir le fichier en base64
    const data = await file.downloadBuffer({});
    const base64 = data.toString('base64');

    // Retourner l'URL data avec le type MIME approprié
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Détermine le type MIME en fonction de l'extension du fichier
   * @param ext - Extension du fichier
   * @returns Type MIME correspondant
   */
  getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Upload d'un fichier
   * @param name - Nom du fichier
   * @param mimeType - Type MIME du fichier
   * @param buffer - Contenu du fichier
   * @param folderId - ID du dossier de destination (optionnel)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du fichier uploadé
   */
  async uploadFile(
    name: string,
    mimeType: string,
    buffer: Buffer,
    folderId?: string,
    userId?: string
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    const folder = folderId
      ? storage.find(file => file.nodeId === folderId) || storage.root
      : storage.root;

    return new Promise((resolve, reject) => {
      const uploadStream = folder.upload({ name, size: buffer.length }, buffer);
      uploadStream.on('complete', (file: { nodeId: string }) => {
        resolve(file.nodeId);
      });
      uploadStream.on('error', reject);
    });
  }

  /**
   * Suppression d'un fichier
   * @param fileId - ID du fichier à supprimer
   * @param userId - ID de l'utilisateur
   * @param folderId - ID du dossier où chercher (optionnel, si non fourni cherche dans tout le compte)
   */
  async deleteFile(fileId: string, userId: string, folderId?: string): Promise<void> {
    const storage = await this.getStorage(userId);
    
    let searchFiles: Array<{ nodeId: string; name?: string; delete?: () => Promise<void> }>;
    
    if (folderId) {
      // Chercher uniquement dans le dossier spécifié
      const folder = storage.find(f => f.nodeId === folderId);
      if (!folder) {
        throw new Error(`Dossier avec ID ${folderId} non trouvé`);
      }
      searchFiles = Object.values(folder.children || {}).filter(child => child.nodeId !== undefined) as Array<{ nodeId: string; name?: string; delete?: () => Promise<void> }>;
      console.log(`📁 Recherche dans le dossier spécifique: ${searchFiles.length} fichiers`);
    } else {
      // Chercher dans tout le storage
      searchFiles = Object.values(storage.files).filter(f => f.nodeId !== undefined) as Array<{ nodeId: string; name?: string; delete?: () => Promise<void> }>;
      console.log(`📁 ${searchFiles.length} fichiers totaux dans le storage`);
    }
    
    const file = searchFiles.find(f => f.nodeId === fileId);
    if (!file) {
      console.log(`❌ Fichier ${fileId} non trouvé`);
      console.log(`🔍 Fichiers disponibles:`);
      searchFiles.slice(0, 5).forEach(f => {
        console.log(`   - ${f.name} (ID: ${f.nodeId})`);
      });
      if (searchFiles.length > 5) {
        console.log(`   ... et ${searchFiles.length - 5} autres fichiers`);
      }
      throw new Error('Fichier non trouvé');
    }
    
    console.log(`✅ Fichier trouvé: ${file.name} (ID: ${file.nodeId})`);
    if (typeof file.delete === 'function') {
      await file.delete();
      console.log(`🗑️ Fichier supprimé avec succès`);
    } else {
      throw new Error('La méthode de suppression du fichier est indisponible');
    }
  }

  /**
   * Téléchargement d'un fichier
   * @param fileId - ID du fichier à télécharger
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Buffer contenant le fichier
   */
  async downloadFile(fileId: string, userId?: string): Promise<Buffer> {
    const storage = await this.getStorage(userId);
    const file = storage.find(f => f.nodeId === fileId);
    if (!file) throw new Error('Fichier non trouvé');

    const data = await file.downloadBuffer({});

    const result = await verify(data);
    if (!result) throw new Error('Fichier corrompu');

    return data;
  }

  /**
   * Remplacement d'un fichier (mise à jour)
   * @param fileId - ID du fichier à remplacer
   * @param name - Nouveau nom du fichier
   * @param mimeType - Type MIME du nouveau fichier
   * @param buffer - Nouveau contenu du fichier
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du nouveau fichier
   */
  async updateFile(
    fileId: string,
    name: string,
    mimeType: string,
    buffer: Buffer,
    userId?: string
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    const oldFile = storage.find(f => f.nodeId === fileId);
    if (!oldFile) throw new Error('Fichier à mettre à jour non trouvé');

    const parent = oldFile.parent || storage.root;
    await oldFile.delete();

    return new Promise((resolve, reject) => {
      const uploadStream = parent.upload({ name, size: buffer.length }, buffer);
      uploadStream.on('complete', (file: { nodeId: string }) => {
        resolve(file.nodeId);
      });
      uploadStream.on('error', reject);
    });
  }

  /**
   * Récupère tous les fichiers de MEGA avec leur contenu.
   * @param folderId - ID du dossier à scanner (optionnel, par défaut le dossier racine)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Un tableau d'objets contenant les informations et le buffer de chaque fichier.
   */
  async getAllFilesWithContent(folderId?: string, userId?: string): Promise<{ fileId: string; name: string; buffer: Buffer; type: string; mimeType: string; size: number }[]> {
    const storage = await this.getStorage(userId);
    
    let targetFolder;
    if (folderId) {
      targetFolder = storage.find(f => f.nodeId === folderId);
      if (!targetFolder) {
        throw new Error(`Dossier avec l'ID ${folderId} non trouvé`);
      }
    } else {
      targetFolder = storage.root;
    }
    
    const files = Object.values(storage.files).filter(file => 
      file.parent === targetFolder && !file.directory
    );
    
    console.log(`📁 Scanning ${folderId ? 'dossier spécifique' : 'dossier racine'}: ${files.length} fichiers trouvés`);

    const filesWithContent: { fileId: string; name: string; buffer: Buffer; type: string; mimeType: string; size: number }[] = [];

    for (const file of files) {
      if (!file.nodeId || !file.name) {
        console.log(`   ⚠️ Fichier ignoré (ID ou nom manquant): ${file.nodeId || 'unknown'}`);
        continue;
      }

      try {
        console.log(`   ⬇️ Téléchargement: ${file.name}...`);
        const buffer = await file.downloadBuffer({});
        
        // Validation du buffer
        if (!buffer || buffer.length === 0) {
          console.warn(`   ⚠️ Fichier vide ignoré: ${file.name}`);
          continue;
        }

        // Détection du type MIME basée sur l'extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const mimeType = this.getMimeType(extension);
        
        filesWithContent.push({
          fileId: file.nodeId,
          name: file.name,
          buffer: buffer,
          type: extension, // Extension du fichier pour compatibilité
          mimeType: mimeType, // Type MIME détecté
          size: buffer.length
        });
        
        console.log(`   ✅ ${file.name} téléchargé (${buffer.length} bytes, type: ${extension}, MIME: ${mimeType})`);
      } catch (error) {
        console.error(`   ❌ Erreur lors du téléchargement du fichier ${file.name} (${file.nodeId}):`, error);
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    console.log(`📋 Récupération terminée: ${filesWithContent.length}/${files.length} fichiers traités avec succès`);
    return filesWithContent;
  }

  /**
   * Crée un dossier sur MEGA
   * @param name - Nom du dossier
   * @param parentFolderId - ID du dossier parent (optionnel, par défaut le dossier racine)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du dossier créé
   */
  async createFolder(name: string, parentFolderId?: string, userId?: string): Promise<string> {
    const storage = await this.getStorage(userId);
    const parentFolder = parentFolderId 
      ? storage.find(f => f.nodeId === parentFolderId) || storage.root
      : storage.root;

    const folder = await parentFolder.mkdir(name);
    if (!folder.nodeId) {
      throw new Error('Impossible de créer le dossier');
    }
    return folder.nodeId;
  }

  /**
   * Nettoie le cache de connexion pour un utilisateur spécifique
   * @param userId - ID de l'utilisateur
   */
  clearUserCache(userId: string): void {
    this.storageCache.delete(userId);
  }

  /**
   * Nettoie tout le cache de connexions
   */
  clearAllCache(): void {
    this.storageCache.clear();
  }
}
