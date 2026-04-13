# Fizika_projekt

Készítette: Barátfalvi Péter, Bodor Dávid, Szabó Márton

Egy egyszerű, kezdőbarát Expo + React Native app, amivel a telefon **magnetometer** szenzorának adatait lehet mérni és megjeleníteni.

Az alkalmazás JavaScript alapon készült, és a mágneses tér változásainak megfigyelésére használható.

## Mit tud az app?

- élő **X / Y / Z** magnetometer értékek megjelenítése (**µT** / mikroteszla)
- teljes mágneses térerősség számítása:

  `|B| = sqrt(x^2 + y^2 + z^2)`

- kalibráció:
  - 8 másodperces min/max alapú offset kalibráció
- mérés indítása / leállítása, mint egy egyszerű felvétel
- CSV export:
  - időbélyeg
  - x
  - y
  - z
  - |B|
- élő vonalgrafikon az időbeli változásról
- kapcsolható grafikon
- auto scale / fixed scale megjelenítés
- referencia vízszintes vonalak a grafikonon

## Mire lesz szükséged?

Mielőtt elindítod a projektet, telepítsd ezeket:

### 1. Node.js
A projekt futtatásához szükség van a **Node.js** telepítésére.

Ajánlott verzió:
- **Node.js 20 vagy újabb**

Ellenőrzés terminálban:

```bash
node -v
npm -v
```

### 2. Expo Go telefonos app
A projekt legegyszerűbben úgy próbálható ki, hogy a telefonodra felteszed az **Expo Go** alkalmazást.

Telepítsd:
- Androidon: **Google Play**
- iPhone-on: **App Store**

Erre azért van szükség, mert a fejlesztői szerver elindítása után a telefonoddal be tudod olvasni a QR-kódot, és rögtön futtatni tudod az appot.

## Projekt indítása lépésről lépésre

### 1. Függőségek telepítése

A projekt mappájában futtasd:

```bash
npm install
```

### 2. Expo csomagok telepítése

Ezután telepítsd az Expo-kompatibilis csomagokat:

```bash
npx expo install expo-sensors expo-file-system expo-sharing react-native-svg
```

### 3. A fejlesztői szerver elindítása

```bash
npm run start
```

vagy:

```bash
npx expo start
```

### 4. App megnyitása telefonon

- indítsd el az **Expo Go** appot a telefonodon
- olvasd be a terminálban vagy böngészőben megjelenő **QR-kódot**
- az app elindul a telefonodon

## Használat röviden

1. Indítsd el az appot
2. Nézd az élő magnetometer értékeket
3. Ha szükséges, futtass kalibrációt
4. Indíts el egy mérést
5. Állítsd le a mérést
6. Exportáld CSV-be az adatokat

## Fontos megjegyzések

- A szenzor adatok zajosak lehetnek fém tárgyak vagy erős elektromágneses források közelében.
- Pontosabb méréshez érdemes időnként kalibrálni.
- A telefon magnetometere nem laboratóriumi mérőműszer, ezért az adatok közelítő jellegűek.
- Weben a magnetometer korlátozottan vagy egyáltalán nem érhető el, ezért **fizikai telefon használata ajánlott**.
- A különböző telefonok szenzorai eltérő pontosságúak lehetnek.

## Hibakeresés kezdőknek

### Ha a projekt nem indul
Próbáld meg újratelepíteni a csomagokat:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Ha a telefon nem csatlakozik
- ellenőrizd, hogy a telefon és a gép ugyanarra a Wi-Fi hálózatra csatlakozik-e
- próbáld meg újraindítani az Expo szervert:

```bash
npx expo start --clear
```

### Ha nem látszik szenzoradat
- próbáld ki valódi telefonon
- nézd meg, hogy a készülék rendelkezik-e magnetometer szenzorral
- weben ez a funkció nem biztos, hogy működik