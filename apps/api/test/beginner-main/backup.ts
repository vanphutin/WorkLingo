import path from 'node:path';
import type {MainScope} from './environment.js';
export interface BackupFile {path:string;bytes:number;sha256:string;exitCode:number;warnings?:number}
export interface BackupReceipt {database:string;archive:BackupFile;globals:BackupFile;status:'ARCHIVE_READABLE';restoreStatus:'NOT_TESTED'}
export interface BackupIO {archive(request:{database:string;path:string}):Promise<BackupFile>;globals(request:{database:string;path:string}):Promise<BackupFile>;inspect(path:string):Promise<BackupFile>;list(path:string):Promise<number>;decode(path:string):Promise<number>}
export async function createMainBackup(scope:MainScope,io:BackupIO):Promise<BackupReceipt>{
 const root=scope.environment.filesystem.backupRoot,database=scope.environment.database.name;
 const archive=await io.archive({database,path:path.join(root,'worklingo.dump')});
 if(archive.exitCode!==0||archive.bytes<=0||archive.warnings)throw Error('MAIN_BACKUP_INVALID');
 const globals=await io.globals({database,path:path.join(root,'globals.sql')});
 const receipt:BackupReceipt={database,archive,globals,status:'ARCHIVE_READABLE',restoreStatus:'NOT_TESTED'};
 await validateMainBackup(scope,receipt,io);return receipt;
}
export async function validateMainBackup(scope:MainScope,receipt:BackupReceipt,io:BackupIO):Promise<void>{
 if(receipt.database!==scope.environment.database.name||receipt.status!=='ARCHIVE_READABLE'||receipt.restoreStatus!=='NOT_TESTED')throw Error('MAIN_BACKUP_INVALID');
 for(const [name,file]of [['worklingo.dump',receipt.archive],['globals.sql',receipt.globals]] as const){
  if(path.resolve(file.path)!==path.resolve(scope.environment.filesystem.backupRoot,name)||file.exitCode!==0||file.bytes<=0||file.warnings||!/^[a-f0-9]{64}$/u.test(file.sha256))throw Error('MAIN_BACKUP_INVALID');
  const current=await io.inspect(file.path);if(current.exitCode!==0||current.sha256!==file.sha256||current.bytes!==file.bytes)throw Error('MAIN_BACKUP_INVALID');
 }
 if(await io.list(receipt.archive.path)!==0||await io.decode(receipt.archive.path)!==0)throw Error('MAIN_BACKUP_INVALID');
}
