/**
 * Google Drive フォルダサービス
 * 経理管理用のフォルダ構成を自動作成する(既存フォルダは再利用・冪等)。
 * ファイルの移動・削除・改名は行わない(原本保護)。
 */
import { DRIVE_FOLDER_TREE, SHEETS } from '../constants';
import { CONFIG_KEYS, getConfig, setConfigValue } from '../config';
import { pad } from '../utils/helpers';
import { logger } from '../utils/logger';
import { getActiveStoreNames } from './masterDataService';
import { ensureSheet } from './sheetService';

type Folder = GoogleAppsScript.Drive.Folder;

/** 親フォルダ直下の同名フォルダを取得、無ければ作成 */
function ensureChildFolder(parent: Folder, name: string): Folder {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/** ルートフォルダを取得(設定ID優先。無ければマイドライブ直下に名前で作成) */
export function ensureRootFolder(): Folder {
  const cfg = getConfig();
  if (cfg.driveRootFolderId) {
    try {
      return DriveApp.getFolderById(cfg.driveRootFolderId);
    } catch (e) {
      logger.warn(
        'ensureRootFolder',
        `設定されたDRIVE_ROOT_FOLDER_IDのフォルダを開けません。名前で再作成します: ${String(e)}`,
      );
    }
  }
  const rootIt = DriveApp.getRootFolder().getFoldersByName(cfg.driveRootFolderName);
  const root = rootIt.hasNext()
    ? rootIt.next()
    : DriveApp.getRootFolder().createFolder(cfg.driveRootFolderName);
  setConfigValue(CONFIG_KEYS.DRIVE_ROOT_FOLDER_ID, root.getId());
  return root;
}

/**
 * フォルダ構成を作成する(冪等)。
 * - 定義済みツリー(DRIVE_FOLDER_TREE)
 * - 01_レシート・領収書 / 02_請求書 には 当年/当月 のサブフォルダ
 * - レシート当月フォルダには稼働店舗ごとのフォルダ
 * 戻り値: 作成・確認したフォルダ数
 */
export function createDriveFolderStructure(): number {
  const root = ensureRootFolder();
  let count = 0;
  const byPath = new Map<string, Folder>();

  for (const path of DRIVE_FOLDER_TREE) {
    let parent = root;
    let current = '';
    for (const part of path.split('/')) {
      current = current ? `${current}/${part}` : part;
      const cached = byPath.get(current);
      if (cached) {
        parent = cached;
      } else {
        parent = ensureChildFolder(parent, part);
        byPath.set(current, parent);
        count++;
      }
    }
  }

  // 当年・当月フォルダ
  const nowD = new Date();
  const year = String(nowD.getFullYear());
  const ym = `${year}-${pad(nowD.getMonth() + 1, 2)}`;
  const receiptRoot = byPath.get('01_レシート・領収書');
  const invoiceRoot = byPath.get('02_請求書');
  if (receiptRoot) {
    const y = ensureChildFolder(receiptRoot, year);
    const m = ensureChildFolder(y, ym);
    count += 2;
    for (const store of getActiveStoreNames()) {
      ensureChildFolder(m, store);
      count++;
    }
  }
  if (invoiceRoot) {
    const y = ensureChildFolder(invoiceRoot, year);
    ensureChildFolder(y, ym);
    count += 2;
  }

  logger.info('createDriveFolderStructure', `フォルダ構成を確認・作成しました(${count}件)`);
  return count;
}

/** フォルダ構成とリンク一覧をログシート横に見えるよう、専用レポートとして返す */
export function describeFolderStructure(): string {
  const root = ensureRootFolder();
  const lines: string[] = [`ルート: ${root.getName()} ${root.getUrl()}`];
  const walk = (folder: Folder, depth: number): void => {
    if (depth > 3) return;
    const it = folder.getFolders();
    const children: Folder[] = [];
    while (it.hasNext()) children.push(it.next());
    children.sort((a, b) => a.getName().localeCompare(b.getName(), 'ja'));
    for (const child of children) {
      lines.push(`${'  '.repeat(depth + 1)}${child.getName()}: ${child.getUrl()}`);
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return lines.join('\n');
}

/** 06_書類処理ルールの「Drive保存フォルダ」列の記載を実フォルダのURLで補足するための参照表を返す */
export function folderLinkRows(): unknown[][] {
  const root = ensureRootFolder();
  const rows: unknown[][] = [];
  const it = root.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    rows.push([f.getName(), f.getUrl()]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ja'));
  return rows;
}

/** ルール未指定時の説明をログへ出す補助(メニューから呼ぶ) */
export function logFolderStructure(): void {
  ensureSheet('SYSTEM_LOG');
  logger.info('driveFolders', `Driveフォルダ構成:\n${describeFolderStructure()}`.slice(0, 450), {
    sheetName: SHEETS.SYSTEM_LOG.name,
  });
}
