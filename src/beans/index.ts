
import { DocumentService } from "../services/documentService";
import { LogService } from "../services/logService";
import { MegaStorageService } from "../services/megaStorage";
import { UserService } from "../services/userService";
import { TagService } from "../services/tagService";
import { SearchService } from "../services/searchService";
import { StatsService } from "../services/statsService";
import { BackupService } from "../services/backupService";
import { UtilsService } from "../services/utilsService";

const logService = new LogService();
const megaStorageService = new MegaStorageService();
const userService = new UserService(logService);
const documentService = new DocumentService(megaStorageService, logService);
const tagService = new TagService(logService);
const searchService = new SearchService(logService);
const statsService = new StatsService(logService);
const backupService = new BackupService(logService, megaStorageService);
const utilsService = new UtilsService(logService);

export {
  logService,
  megaStorageService,
  userService,
  documentService,
  tagService,
  searchService,
  statsService,
  backupService,
  utilsService
};