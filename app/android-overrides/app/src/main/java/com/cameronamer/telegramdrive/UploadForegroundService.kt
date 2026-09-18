package com.cameronamer.telegramdrive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.annotation.Keep
import androidx.core.app.NotificationCompat
import java.io.File

@Keep
class UploadForegroundService : Service() {
  private var activeCount = 0
  private var progress = 0
  private var speedBytesPerSecond = 0L
  private var paused = false
  private var currentFileName: String? = null
  private var currentTransferType: String? = null
  private var currentPreviewPath: String? = null

  companion object {
    private const val CHANNEL_ID = "UploadServiceChannel"
    private const val COMPLETE_CHANNEL_ID = "TransferCompleteChannel"
    private const val NOTIFICATION_ID = 2026
    private const val NOTIFICATION_COMPLETE_ID = 2029
    private const val ACTION_UPDATE = "com.cameronamer.telegramdrive.TRANSFER_UPDATE"
    private const val ACTION_STOP = "com.cameronamer.telegramdrive.TRANSFER_STOP"
    private const val ACTION_PAUSE = "com.cameronamer.telegramdrive.TRANSFER_PAUSE"
    private const val ACTION_RESUME = "com.cameronamer.telegramdrive.TRANSFER_RESUME"
    private const val ACTION_CANCEL = "com.cameronamer.telegramdrive.TRANSFER_CANCEL"
    private const val EXTRA_ACTIVE = "active"
    private const val EXTRA_PROGRESS = "progress"
    private const val EXTRA_SPEED = "speed"
    private const val EXTRA_PAUSED = "paused"
    private const val EXTRA_FILE_NAME = "file_name"
    private const val EXTRA_TRANSFER_TYPE = "transfer_type"
    private const val EXTRA_PREVIEW_PATH = "preview_path"

    @Volatile
    private var activeInstance: UploadForegroundService? = null

    @Volatile
    private var isTransferActive: Boolean = false

    private val mainHandler = Handler(Looper.getMainLooper())

    @JvmStatic
    fun loadThumbnail(path: String?): Bitmap? {
      if (path.isNullOrBlank()) return null
      return try {
        val file = File(path)
        if (!file.exists() || !file.canRead() || file.isDirectory) return null
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, options)
        if (options.outWidth <= 0 || options.outHeight <= 0) return null
        val maxDim = 128
        var sample = 1
        while (options.outWidth / sample > maxDim || options.outHeight / sample > maxDim) {
          sample *= 2
        }
        val decodeOptions = BitmapFactory.Options().apply {
          inSampleSize = sample
          inPreferredConfig = Bitmap.Config.RGB_565
        }
        BitmapFactory.decodeFile(path, decodeOptions)
      } catch (_: Throwable) {
        null
      }
    }

    @JvmStatic
    fun startService(context: Context) {
      isTransferActive = true
      MainActivity.requestTransferNotificationPermission()
      TransferRecoveryWorker.setPendingTransfers(context, true)
      TransferJobService.cancel(context)
      val intent = Intent(context, UploadForegroundService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      } catch (e: Throwable) {
        Log.w("UploadService", "Could not start service", e)
      }
    }

    @JvmStatic
    fun updateService(
      context: Context,
      active: Int,
      percent: Int,
      speed: Long,
      isPaused: Boolean,
      fileName: String?,
      transferType: String?,
      previewPath: String?,
    ) {
      if (active <= 0 && !isPaused) {
        // Active is 0 and not paused: do NOT restart or keep ongoing foreground notification
        return
      }
      isTransferActive = true
      TransferRecoveryWorker.setPendingTransfers(context, active > 0 || isPaused)
      TransferJobService.cancel(context)

      // Fast in-process update if service is already active
      val instance = activeInstance
      if (instance != null) {
        mainHandler.post {
          val cur = activeInstance
          if (cur != null && isTransferActive) {
            cur.activeCount = active.coerceAtLeast(0)
            cur.progress = percent.coerceIn(0, 100)
            cur.speedBytesPerSecond = speed.coerceAtLeast(0L)
            cur.paused = isPaused
            if (!fileName.isNullOrBlank()) cur.currentFileName = fileName
            if (!transferType.isNullOrBlank()) cur.currentTransferType = transferType
            if (!previewPath.isNullOrBlank()) cur.currentPreviewPath = previewPath
            cur.notifyProgress()
          }
        }
        return
      }

      val intent = Intent(context, UploadForegroundService::class.java).apply {
        action = ACTION_UPDATE
        putExtra(EXTRA_ACTIVE, active.coerceAtLeast(0))
        putExtra(EXTRA_PROGRESS, percent.coerceIn(0, 100))
        putExtra(EXTRA_SPEED, speed.coerceAtLeast(0L))
        putExtra(EXTRA_PAUSED, isPaused)
        putExtra(EXTRA_FILE_NAME, fileName)
        putExtra(EXTRA_TRANSFER_TYPE, transferType)
        putExtra(EXTRA_PREVIEW_PATH, previewPath)
      }
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      } catch (e: Throwable) {
        Log.w("UploadService", "Could not start service for update", e)
      }
    }

    @JvmStatic
    fun stopService(
      context: Context,
      completedFileName: String?,
      completedTransferType: String?,
      previewPath: String?,
    ) {
      isTransferActive = false
      TransferRecoveryWorker.setPendingTransfers(context, false)
      TransferJobService.cancel(context)

      mainHandler.post {
        val instance = activeInstance
        if (instance != null) {
          try {
            instance.stopForeground(STOP_FOREGROUND_REMOVE)
            instance.stopSelf()
          } catch (e: Throwable) {
            Log.w("UploadService", "Error stopping service instance", e)
          }
          activeInstance = null
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.cancel(NOTIFICATION_ID)
        manager?.cancel(2028)
      }

      try {
        val stopIntent = Intent(context, UploadForegroundService::class.java).apply {
          action = ACTION_STOP
        }
        context.startService(stopIntent)
      } catch (_: Throwable) {
        try {
          context.stopService(Intent(context, UploadForegroundService::class.java))
        } catch (_: Throwable) {}
      }

      // Only show completion notification if a transfer actually finished successfully
      if (!completedFileName.isNullOrBlank()) {
        showCompletionNotification(context, completedFileName, completedTransferType, previewPath)
      }
    }

    private fun showCompletionNotification(
      context: Context,
      fileName: String,
      transferType: String?,
      previewPath: String?,
    ) {
      try {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        createNotificationChannels(context)

        val openApp = PendingIntent.getActivity(
          context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val isDownload = transferType == "download"
        val title = if (isDownload) "Download complete" else "Upload complete"

        // Safe 2D system drawable for smallIcon to prevent BadNotificationException
        // (applicationInfo.icon is an AdaptiveIconDrawable which is rejected as a smallIcon by Android OS)
        val smallIcon = if (isDownload) {
          android.R.drawable.stat_sys_download_done
        } else {
          android.R.drawable.stat_sys_upload_done
        }

        val builder = NotificationCompat.Builder(context, COMPLETE_CHANNEL_ID)
          .setContentTitle(title)
          .setContentText(fileName)
          .setSubText("Success")
          .setSmallIcon(smallIcon)
          .setContentIntent(openApp)
          .setAutoCancel(true)
          .setOngoing(false)
          .setPriority(NotificationCompat.PRIORITY_DEFAULT)
          .setCategory(NotificationCompat.CATEGORY_STATUS)
          .setStyle(
            NotificationCompat.BigTextStyle()
              .setBigContentTitle(title)
              .bigText(fileName)
              .setSummaryText("Success")
          )

        val thumbnailBitmap = loadThumbnail(previewPath)
        if (thumbnailBitmap != null) {
          builder.setLargeIcon(thumbnailBitmap)
        }

        manager.notify(NOTIFICATION_COMPLETE_ID, builder.build())
      } catch (e: Throwable) {
        Log.w("UploadService", "Could not show completion notification", e)
      }
    }

    private fun createNotificationChannels(context: Context) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val transferChannel = NotificationChannel(
          CHANNEL_ID,
          "Telegram Drive transfers",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Upload and download progress"
          setShowBadge(false)
        }
        val completeChannel = NotificationChannel(
          COMPLETE_CHANNEL_ID,
          "Completed transfers",
          NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
          description = "Notifications when transfers complete successfully"
          setShowBadge(true)
          enableVibration(true)
        }
        manager.createNotificationChannel(transferChannel)
        manager.createNotificationChannel(completeChannel)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    activeInstance = this
    createNotificationChannels(this)
    startAsForeground(createNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    activeInstance = this
    when (intent?.action) {
      ACTION_UPDATE -> {
        if (!isTransferActive) {
          // Stale update intent arrived after stopService: clean up and exit immediately
          stopForeground(STOP_FOREGROUND_REMOVE)
          getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
          stopSelf()
          return START_NOT_STICKY
        }
        activeCount = intent.getIntExtra(EXTRA_ACTIVE, activeCount).coerceAtLeast(0)
        progress = intent.getIntExtra(EXTRA_PROGRESS, progress).coerceIn(0, 100)
        speedBytesPerSecond = intent.getLongExtra(EXTRA_SPEED, speedBytesPerSecond).coerceAtLeast(0L)
        paused = intent.getBooleanExtra(EXTRA_PAUSED, paused)
        currentFileName = intent.getStringExtra(EXTRA_FILE_NAME) ?: currentFileName
        currentTransferType = intent.getStringExtra(EXTRA_TRANSFER_TYPE) ?: currentTransferType
        currentPreviewPath = intent.getStringExtra(EXTRA_PREVIEW_PATH) ?: currentPreviewPath
        notifyProgress()
      }
      ACTION_STOP -> {
        isTransferActive = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
        stopSelf()
      }
      ACTION_PAUSE -> { paused = true; MainActivity.emitTransferAction("pause"); notifyProgress() }
      ACTION_RESUME -> { paused = false; MainActivity.emitTransferAction("resume"); notifyProgress() }
      ACTION_CANCEL -> {
        isTransferActive = false
        MainActivity.emitTransferAction("cancel")
        TransferRecoveryWorker.setPendingTransfers(this, false)
        stopForeground(STOP_FOREGROUND_REMOVE)
        getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
        stopSelf()
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    if (activeInstance == this) {
      activeInstance = null
    }
    stopForeground(STOP_FOREGROUND_REMOVE)
    getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
    super.onDestroy()
  }

  override fun onTimeout(startId: Int, fgsType: Int) {
    isTransferActive = false
    MainActivity.emitTransferAction("timeout")
    Log.w("UploadService", "Android data-sync foreground-service timeout reached")
    TransferRecoveryWorker.schedule(this)
    stopForeground(STOP_FOREGROUND_REMOVE)
    getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
    stopSelf(startId)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onTaskRemoved(rootIntent: Intent?) {
    TransferRecoveryWorker.schedule(this)
    super.onTaskRemoved(rootIntent)
  }

  private fun startAsForeground(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else startForeground(NOTIFICATION_ID, notification)
  }

  private fun actionIntent(action: String, requestCode: Int) = PendingIntent.getService(
    this, requestCode, Intent(this, UploadForegroundService::class.java).setAction(action),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )

  private fun formatSpeed(bytes: Long): String {
    if (bytes <= 0L) return ""
    val units = arrayOf("B", "KB", "MB", "GB")
    var value = bytes.toDouble()
    var unit = 0
    while (value >= 1024.0 && unit < units.lastIndex) { value /= 1024.0; unit++ }
    return String.format(java.util.Locale.US, "%.1f %s/s", value, units[unit])
  }

  private fun createNotification(): Notification {
    val openApp = PendingIntent.getActivity(
      this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val isDownload = currentTransferType == "download"
    val actionWord = if (isDownload) "Downloading" else "Uploading"
    val title = when {
      paused && !currentFileName.isNullOrBlank() -> "Paused: $currentFileName"
      paused -> "Transfers paused"
      !currentFileName.isNullOrBlank() && activeCount > 1 -> "$actionWord $currentFileName (+${activeCount - 1} more)"
      !currentFileName.isNullOrBlank() -> "$actionWord $currentFileName"
      activeCount > 0 -> "$activeCount transfer${if (activeCount == 1) "" else "s"} active"
      else -> "Preparing transfers…"
    }

    val state = when {
      paused -> "Paused"
      speedBytesPerSecond > 0 -> "$progress% · ${formatSpeed(speedBytesPerSecond)}"
      progress > 0 -> "$progress%"
      else -> "In progress…"
    }

    val smallIcon = when {
      paused -> android.R.drawable.ic_media_pause
      isDownload -> android.R.drawable.stat_sys_download
      else -> android.R.drawable.stat_sys_upload
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(state)
      .setSmallIcon(smallIcon)
      .setContentIntent(openApp)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setProgress(100, progress, activeCount == 0)

    if (activeCount > 1) {
      builder.setSubText("$activeCount files")
    }

    val thumbnailBitmap = loadThumbnail(currentPreviewPath)
    if (thumbnailBitmap != null) {
      builder.setLargeIcon(thumbnailBitmap)
    }

    if (paused) builder.addAction(android.R.drawable.ic_media_play, "Resume", actionIntent(ACTION_RESUME, 2))
    else builder.addAction(android.R.drawable.ic_media_pause, "Pause", actionIntent(ACTION_PAUSE, 1))
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", actionIntent(ACTION_CANCEL, 3))
    return builder.build()
  }

  private fun notifyProgress() {
    getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, createNotification())
  }
}
