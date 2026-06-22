# Join Events — Mobile App

React Native (Expo) app that talks to the same NestJS API as the web client.

## Setup

```bash
# from project root, once
pnpm install

# in apps/mobile
cd apps/mobile
pnpm install     # or `npx expo install` if there are RN version mismatches
```

## Configure the API URL

The mobile app cannot reach `localhost:4000` (that's the phone's localhost, not your laptop).

1. Find your laptop's local IP — on Windows: `ipconfig` → IPv4 Address (e.g. `192.168.1.42`). On macOS: `ifconfig | grep "inet "`.
2. Open **`app.json`** → `expo.extra.apiUrl` → replace the placeholder with `http://YOUR_IP:4000/api/v1`.
3. Make sure the API is bound to all interfaces (it already is — `app.listen(env.PORT, '0.0.0.0')`).

## Run

```bash
pnpm start
```

Expo prints a QR code. Scan it with:
- **iOS**: open Camera → tap the link
- **Android**: open the Expo Go app → "Scan QR code"

## Screens

| Screen | Status |
| --- | --- |
| Login (Mobile OTP) | ✅ Working — autofills OTP in dev mode |
| Events feed | ✅ Pulls from `/api/v1/events` |
| Event detail | ✅ Cover, organiser, description |
| Wallet | ✅ Balance + top-up + history |
| Bookings | ✅ Your bookings |
| Booking flow | ⏳ Stub — web flow works; mobile flow in next release |

## Build for production

```bash
# EAS Build (Expo's cloud build service)
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android  # or ios
```

Bundle IDs are already set in `app.json`:
- Android: `in.joinevents.app`
- iOS: `in.joinevents.app`

## Architecture

```
App.tsx
  └─ AuthProvider (AsyncStorage-backed)
      └─ NavigationContainer
          └─ Stack
              ├─ Login   (anonymous)
              └─ Events / EventDetail / Wallet / Bookings  (authenticated)
```

The API client (`src/lib/api.ts`) mirrors the web's typed surface, just over plain `fetch` + AsyncStorage instead of localStorage. Switching to native push (FCM) and image upload (R2) is one file each per the master doc spec.
