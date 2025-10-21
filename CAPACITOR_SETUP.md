# 📱 Guía de Configuración Capacitor - FitYourself

## ✅ Ya Completado
- ✅ Capacitor instalado y configurado
- ✅ Splash screen animado con Lottie implementado
- ✅ Logo FY integrado
- ✅ Persistencia de sesión (recuerda login)
- ✅ Navegación automática (Login vs Home según estado auth)

## 🚀 Próximos Pasos para Publicar en App Store & Google Play

### 1. Exportar a GitHub
```bash
# Desde Lovable, haz clic en "Export to Github"
# Luego clona tu repositorio:
git clone <tu-repo-url>
cd fityourself
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Inicializar Capacitor
```bash
npx cap init
# Usa los valores ya configurados:
# - App ID: app.lovable.5c3dc5bf0e654f2d866c24c9d9b4a40c
# - App Name: fityourself
```

### 4. Agregar Plataformas Nativas

#### Para iOS (requiere Mac + Xcode)
```bash
npx cap add ios
npx cap update ios
```

#### Para Android (requiere Android Studio)
```bash
npx cap add android
npx cap update android
```

### 5. Build y Sync
```bash
# Build del proyecto web
npm run build

# Sincronizar con plataformas nativas
npx cap sync
```

### 6. Configurar Splash Nativo

#### iOS (splash.png)
- Abre `ios/App/App/Assets.xcassets/Splash.imageset/`
- Reemplaza con tu logo FY en resoluciones:
  - splash.png (1x): 1024x1024px
  - splash@2x.png (2x): 2048x2048px
  - splash@3x.png (3x): 3072x3072px

#### Android (splash.png)
- Abre `android/app/src/main/res/`
- Crea carpetas: `drawable-mdpi`, `drawable-hdpi`, `drawable-xhdpi`, `drawable-xxhdpi`, `drawable-xxxhdpi`
- Agrega logo FY en cada resolución:
  - mdpi: 320x320px
  - hdpi: 480x480px
  - xhdpi: 640x640px
  - xxhdpi: 960x960px
  - xxxhdpi: 1280x1280px

### 7. Configurar Íconos de App

#### iOS
Genera todos los tamaños requeridos (20px hasta 1024px) y agrégalos en:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

#### Android
Genera íconos en:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

**Tip:** Usa herramientas como:
- [icon.kitchen](https://icon.kitchen)
- [makeappicon.com](https://makeappicon.com)

### 8. Probar en Dispositivo/Emulador

#### iOS
```bash
npx cap open ios
# En Xcode: Selecciona dispositivo → Run
```

#### Android
```bash
npx cap open android
# En Android Studio: Selecciona emulador → Run
```

### 9. Configurar para Producción

#### iOS (Info.plist)
Edita `ios/App/App/Info.plist`:
```xml
<key>UIStatusBarStyle</key>
<string>UIStatusBarStyleLightContent</string>
<key>UIViewControllerBasedStatusBarAppearance</key>
<true/>
```

#### Android (styles.xml)
Edita `android/app/src/main/res/values/styles.xml`:
```xml
<item name="android:statusBarColor">#0C0C0C</item>
<item name="android:windowLightStatusBar">false</item>
```

### 10. Desactivar Server Mode para Producción

**IMPORTANTE:** Antes de publicar, edita `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.5c3dc5bf0e654f2d866c24c9d9b4a40c',
  appName: 'fityourself',
  webDir: 'dist',
  // ❌ ELIMINA O COMENTA el "server" para producción:
  // server: {
  //   url: 'https://...',
  //   cleartext: true
  // },
};
```

### 11. Builds de Producción

#### iOS (App Store)
1. En Xcode: Product → Archive
2. Distribuir a App Store Connect
3. Sube a TestFlight → Review → Producción

#### Android (Google Play)
1. Genera signing key:
```bash
keytool -genkey -v -keystore fityourself.keystore -alias fityourself -keyalg RSA -keysize 2048 -validity 10000
```

2. Configura en `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file("../../fityourself.keystore")
        storePassword "tu-password"
        keyAlias "fityourself"
        keyPassword "tu-password"
    }
}
```

3. Build release:
```bash
cd android
./gradlew bundleRelease
# AAB en: android/app/build/outputs/bundle/release/app-release.aab
```

4. Sube a Google Play Console → Internal Testing → Production

## 🎨 Configuración de Splash Actual

- **Fondo:** `#0C0C0C` (negro casi puro)
- **Logo:** Blanco (`#FFFFFF`)
- **Animación:** Fade-in (1.2s) → Hold con pulso (1.5s) → Fade-out (0.8s)
- **Duración total:** ~3.5s
- **Navegación:**
  - ✅ Usuario con sesión → `/` (Home)
  - ❌ Sin sesión → `/login`

## 🔧 Troubleshooting

### "Cannot find module '@capacitor/core'"
```bash
npm install
npx cap sync
```

### Splash no aparece en iOS
- Verifica que `LaunchScreen.storyboard` use el asset correcto
- Limpia build: Product → Clean Build Folder en Xcode

### App crashea en Android
```bash
# Revisar logs:
npx cap run android --livereload --external
adb logcat
```

### Hot-reload no funciona
- Asegúrate de que tu dispositivo y PC estén en la misma red WiFi
- Verifica que la URL en `capacitor.config.ts` sea accesible desde el dispositivo

## 📚 Recursos
- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Publishing Guide](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Android Publishing Guide](https://capacitorjs.com/docs/android/deploying-to-google-play)
- [Lovable + Capacitor Blog Post](https://docs.lovable.dev)

## ⚠️ Importante
- **Siempre** haz `npx cap sync` después de `git pull` si cambias código web
- **Nunca** publiques con `server.url` activo en `capacitor.config.ts`
- **Testea** en dispositivos reales antes de publicar (emuladores pueden comportarse diferente)

---

**¿Necesitas ayuda?** Consulta la [documentación de Capacitor](https://capacitorjs.com/docs) o la comunidad de [Lovable](https://discord.com/channels/1119885301872070706).
