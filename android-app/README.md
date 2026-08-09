# 📱 CampusPrint Native Android Application (`android-app/`)

The **CampusPrint Android App** is built natively in **Kotlin** using **Jetpack Compose**. 

It provides campus print shop staff and delivery agents with real-time order scanning, instant QR status verification, and push notifications for physical order handovers.

---

## ✨ Features

- **📷 Instant CameraX QR Code Verification**:
  - High-speed camera scanning powered by **Google ML Kit Barcode Scanning**.
  - One-tap status transitions (`PENDING` → `PRINTED` → `HANDED_TO_AGENT` → `DELIVERED`).
- **🔔 Real-Time Push Notifications**:
  - **Firebase Cloud Messaging (FCM)** integration for delivery dispatches and shop alerts.
- **🎨 Modern Material 3 UI**:
  - Responsive Jetpack Compose layouts with dark mode support.
- **🔐 Secure Session Persistence**:
  - Encrypted auth credentials stored via AndroidX DataStore Preferences.

---

## 🛠️ Tech Stack

- **Language**: Kotlin 2.0+ (Target SDK: 37, Min SDK: 24)
- **UI Framework**: Jetpack Compose & Material 3
- **Architecture**: MVVM + Clean Architecture with Dagger Hilt DI & KSP
- **Networking**: Retrofit 2 + Gson Converter + OkHttp Logging Interceptor
- **Camera & Scanning**: Android CameraX + Google ML Kit Barcode Scanning
- **Notifications & Media**: Firebase Cloud Messaging (FCM), Coil Compose

---

## 📂 Repository Structure

```
android-app/
├── app/
│   ├── src/main/java/com/campusprint/app/
│   │   ├── data/          # Remote API repositories & DataStore models
│   │   ├── di/            # Dagger Hilt dependency injection modules
│   │   ├── ui/            # Jetpack Compose screens, components & viewmodels
│   │   └── util/          # CameraX & ML Kit QR scanner utilities
│   └── build.gradle.kts   # App-level dependencies & Compose configuration
├── build.gradle.kts       # Project-level build script
└── settings.gradle.kts    # Dependency resolution management
```

---

## 🚀 Building & Running

### Prerequisites

- Android Studio Ladybug / Jellyfish or newer
- JDK 17
- Android device or emulator running Android 7.0+ (API 24+)

### Build Steps

1. **Clone & Open Project**:
   Open `android-app/` directory in Android Studio.

2. **Sync Gradle**:
   Let Gradle download all dependencies specified in `build.gradle.kts`.

3. **Build APK**:
   ```bash
   ./gradlew assembleDebug
   ```

4. **Install on Device**:
   ```bash
   ./gradlew installDebug
   ```
