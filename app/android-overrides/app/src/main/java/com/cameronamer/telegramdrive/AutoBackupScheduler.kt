package com.cameronamer.telegramdrive

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import androidx.annotation.Keep
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

@Keep
object AutoBackupScheduler {
  private const val TAG = "AutoBackupScheduler"
  private const val PREFS = "telegram_drive_auto_backup_v1"
  private const val KEY_ENABLED = "auto_backup_enabled"
  private const val KEY_WIFI_ONLY = "auto_backup_wifi_only"
  private const val KEY_REQUIRE_CHARGING = "auto_backup_require_charging"
  private const val PERIODIC_WORK_NAME = "telegram-drive-auto-backup-periodic"
  private const val IMMEDIATE_WORK_NAME = "telegram-drive-auto-backup-immediate"

  private val mediaObserverRegistered = AtomicBoolean(false)
  private var mediaObserver: ContentObserver? = null

  @JvmStatic
  fun configure(context: Context, enabled: Boolean, wifiOnly: Boolean, requireCharging: Boolean) {
    try {
      Log.i(TAG, "configure: enabled=$enabled, wifiOnly=$wifiOnly, requireCharging=$requireCharging")
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      prefs.edit()
        .putBoolean(KEY_ENABLED, enabled)
        .putBoolean(KEY_WIFI_ONLY, wifiOnly)
        .putBoolean(KEY_REQUIRE_CHARGING, requireCharging)
        .apply()

      if (enabled) {
        schedulePeriodicBackup(context, wifiOnly, requireCharging)
        registerMediaObserver(context)
      } else {
        cancelBackup(context)
        unregisterMediaObserver(context)
      }
    } catch (e: Throwable) {
      Log.e(TAG, "configure failed", e)
    }
  }

  @JvmStatic
  fun isEnabled(context: Context): Boolean {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return prefs.getBoolean(KEY_ENABLED, false)
  }

  @JvmStatic
  fun schedulePeriodicBackup(context: Context, wifiOnly: Boolean, requireCharging: Boolean) {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
      .setRequiresCharging(requireCharging)
      .setRequiresBatteryNotLow(true)
      .setRequiresStorageNotLow(true)
      .build()

    val periodicRequest = PeriodicWorkRequestBuilder<AutoBackupWorker>(
      15, TimeUnit.MINUTES,
      5, TimeUnit.MINUTES
    )
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.UPDATE,
      periodicRequest
    )
    Log.i(TAG, "Periodic auto-backup scheduled every 15 minutes with constraints")
  }

  @JvmStatic
  fun scheduleImmediate(context: Context, delaySeconds: Long = 10L) {
    if (!isEnabled(context)) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val wifiOnly = prefs.getBoolean(KEY_WIFI_ONLY, true)
    val requireCharging = prefs.getBoolean(KEY_REQUIRE_CHARGING, false)

    val constraints = Constraints.Builder()
      .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
      .setRequiresCharging(requireCharging)
      .setRequiresBatteryNotLow(true)
      .build()

    val immediateRequest = OneTimeWorkRequestBuilder<AutoBackupWorker>()
      .setConstraints(constraints)
      .setInitialDelay(delaySeconds, TimeUnit.SECONDS)
      .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
      IMMEDIATE_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      immediateRequest
    )
    Log.i(TAG, "Immediate auto-backup triggered (delay ${delaySeconds}s)")
  }

  @JvmStatic
  fun cancelBackup(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME)
    WorkManager.getInstance(context).cancelUniqueWork(IMMEDIATE_WORK_NAME)
    Log.i(TAG, "Auto-backup scheduled works cancelled")
  }

  @JvmStatic
  fun onBoot(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val enabled = prefs.getBoolean(KEY_ENABLED, false)
    if (enabled) {
      val wifiOnly = prefs.getBoolean(KEY_WIFI_ONLY, true)
      val requireCharging = prefs.getBoolean(KEY_REQUIRE_CHARGING, false)
      schedulePeriodicBackup(context, wifiOnly, requireCharging)
      registerMediaObserver(context)
      Log.i(TAG, "Restored auto-backup schedule on phone reboot")
    }
  }

  @JvmStatic
  fun registerMediaObserver(context: Context) {
    if (mediaObserverRegistered.getAndSet(true)) return
    try {
      val handler = Handler(Looper.getMainLooper())
      mediaObserver = object : ContentObserver(handler) {
        override fun onChange(selfChange: Boolean, uri: Uri?) {
          super.onChange(selfChange, uri)
          Log.i(TAG, "Media change detected ($uri), scheduling debounced backup")
          scheduleImmediate(context, delaySeconds = 15L)
        }
      }
      val resolver = context.contentResolver
      resolver.registerContentObserver(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, mediaObserver!!)
      resolver.registerContentObserver(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, mediaObserver!!)
      Log.i(TAG, "Registered MediaStore ContentObserver for images and videos")
    } catch (e: Throwable) {
      Log.w(TAG, "Could not register MediaStore ContentObserver", e)
    }
  }

  @JvmStatic
  fun unregisterMediaObserver(context: Context) {
    if (!mediaObserverRegistered.getAndSet(false)) return
    try {
      mediaObserver?.let {
        context.contentResolver.unregisterContentObserver(it)
        mediaObserver = null
      }
    } catch (_: Throwable) {}
  }
}
