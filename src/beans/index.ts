
import { DocumentService } from "../services/documentService";
import { LogService } from "../services/logService";
import { MegaStorageService } from "../services/megaStorage";
import { UserService } from "../services/userService";

const logService = new LogService();
const megaStorageService = new MegaStorageService();
const userService = new UserService(logService);
const documentService = new DocumentService(megaStorageService, logService);

export {
  logService,
  megaStorageService,
  userService,
  documentService
};