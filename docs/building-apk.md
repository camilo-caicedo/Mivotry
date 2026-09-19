# Generar APK — Mivotry

Guía de referencia para compilar y distribuir Mivotry como APK de Android usando **EAS Build** (Expo Application Services).

---

## Requisitos previos

| Herramienta | Versión mínima | Cómo instalar |
|-------------|----------------|---------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| EAS CLI | 14+ | `npm install -g eas-cli` |
| Cuenta Expo | — | [expo.dev](https://expo.dev) (gratis) |

---

## Primera vez (configuración inicial)

```bash
# 1. Instalar EAS CLI globalmente
npm install -g eas-cli

# 2. Iniciar sesión con tu cuenta de Expo
eas login

# 3. Vincular el proyecto (solo una vez, ya genera el projectId en app.json)
eas build:configure
```

> El `projectId` ya está guardado en `app.json` → `expo.extra.eas.projectId`.  
> Si ya está configurado, salta directo al paso de build.

---

## Generar el APK (preview)

```bash
eas build --platform android --profile preview
```

- Tarda **~10–15 minutos** en los servidores de Expo.
- Al terminar, EAS imprime una **URL de descarga directa** del `.apk`.
- Descarga el archivo y pásalo al teléfono (cable USB, Google Drive, WhatsApp, etc.).
- En Android: habilita **"Instalar apps de fuentes desconocidas"** la primera vez.

### Perfiles disponibles

| Perfil | Comando | Resultado | Uso |
|--------|---------|-----------|-----|
| `preview` | `eas build --platform android --profile preview` | `.apk` instalable directo | Testing / distribución interna |
| `production` | `eas build --platform android --profile production` | `.aab` para Play Store | Publicación en Google Play |

---

## Gotchas conocidos

### ❌ `AAPT: error: file failed to compile` (icon.png)
El icono era un JPEG con extensión `.png`. AAPT2 valida la firma real del archivo.  
**Solución aplicada:** se convirtió a PNG válido con PowerShell:
```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("$PWD\assets\icon.png")
$img.Save("$PWD\assets\icon_fixed.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Remove-Item ".\assets\icon.png"
Rename-Item ".\assets\icon_fixed.png" "icon.png"
```

### ❌ `Gradle build failed` sin error claro
Causa más común: un plugin nativo de Expo no está declarado en `app.json`.  
Siempre que agregues un paquete que tenga módulos nativos (ej. `expo-notifications`, `expo-camera`), agrégalo también en `plugins`:

```json
"plugins": [
  "expo-font",
  ["expo-notifications", { "icon": "./assets/icon.png", "color": "#0B2B33" }]
]
```

### ❌ Build exitoso pero cambios JS no aparecen
Los builds de EAS no incluyen actualizaciones OTA automáticas. Cualquier cambio de código requiere un nuevo build para reflejarse en el APK instalado.

---

## Verificar el APK antes de subir a EAS

```bash
# Verifica TypeScript sin errores antes de hacer push
.\node_modules\.bin\tsc --noEmit
```

Solo haz push cuando TypeScript pase con exit code 0. EAS construye desde el último commit en `master`.

---

## Ver builds anteriores

```bash
eas build:list --platform android
```

O en el dashboard web: [expo.dev/accounts/camilo-caicedo/projects/mivotry/builds](https://expo.dev/accounts/camilo-caicedo/projects/mivotry/builds)
