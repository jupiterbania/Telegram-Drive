package com.cameronamer.telegramdrive

import android.content.Context
import android.util.Log
import androidx.annotation.Keep
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

@Keep
class AutoBackupWorker(
  appContext: Context,
  params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

  companion object {
    private const val TAG = "AutoBackupWorker"
  }

  override suspend fun doWork(): Result {
    if (!AutoBackupScheduler.isEnabled(applicationContext)) {
      return Result.success()
    }

    Log.i(TAG, "AutoBackupWorker executing background auto-backup check")

    if (!MainActivity.checkStoragePermission()) {
      Log.w(TAG, "Storage permission not granted, skipping auto-backup")
      return Result.success()
    }

    // Protect background execution with foreground dataSync service
    UploadForegroundService.startService(applicationContext)

    // Notify the UI/WebView to trigger sync pass if app runtime is alive
    MainActivity.emitTransferAction("trigger_sync")

    return Result.success()
  }
}
