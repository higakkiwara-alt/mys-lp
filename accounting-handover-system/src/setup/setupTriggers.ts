/**
 * トリガーの設定(冪等)
 * 同じハンドラー名のトリガーが既にあれば作成しない(重複防止)。
 */
import { getConfig } from '../config';
import { logger } from '../utils/logger';
import { getSs } from '../services/sheetService';

interface TriggerPlan {
  handler: string;
  create: () => GoogleAppsScript.Script.Trigger;
}

export function setupTriggers(): void {
  const cfg = getConfig();
  const ss = getSs();
  const existing = new Set(ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction()));

  const plans: TriggerPlan[] = [
    {
      handler: 'handleEditInstallable',
      create: () =>
        ScriptApp.newTrigger('handleEditInstallable').forSpreadsheet(ss).onEdit().create(),
    },
    {
      handler: 'handleChange',
      create: () => ScriptApp.newTrigger('handleChange').forSpreadsheet(ss).onChange().create(),
    },
    {
      handler: 'handleFormSubmit',
      create: () =>
        ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(ss).onFormSubmit().create(),
    },
    {
      handler: 'jobDailyDeadlineCheck',
      create: () =>
        ScriptApp.newTrigger('jobDailyDeadlineCheck')
          .timeBased()
          .everyDays(1)
          .atHour(cfg.notificationHour)
          .create(),
    },
    {
      handler: 'jobDataIntegrityCheck',
      create: () =>
        ScriptApp.newTrigger('jobDataIntegrityCheck')
          .timeBased()
          .everyDays(1)
          .atHour(Math.min(cfg.notificationHour + 1, 23))
          .create(),
    },
    {
      handler: 'jobMonthlyChecklist',
      create: () =>
        ScriptApp.newTrigger('jobMonthlyChecklist').timeBased().onMonthDay(1).atHour(6).create(),
    },
    {
      handler: 'jobIntegrationSync',
      create: () =>
        ScriptApp.newTrigger('jobIntegrationSync')
          .timeBased()
          .everyDays(1)
          .atHour(Math.min(cfg.notificationHour + 2, 23))
          .create(),
    },
    {
      handler: 'jobMonthlyReport',
      create: () =>
        ScriptApp.newTrigger('jobMonthlyReport').timeBased().onMonthDay(2).atHour(7).create(),
    },
  ];

  let created = 0;
  for (const plan of plans) {
    if (existing.has(plan.handler)) continue;
    plan.create();
    created++;
  }
  logger.info('setupTriggers', `トリガーを確認しました(新規作成: ${created}件)`);
}
