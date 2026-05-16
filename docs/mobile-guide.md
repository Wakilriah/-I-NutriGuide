# Mobile App Guide - React Native + Expo

## Current Stack

- Expo SDK 54
- React Native 0.81
- React 19.1
- TypeScript
- Expo Router
- React Query
- Zustand
- Axios
- Expo SecureStore
- React Hook Form
- Zod
- Jest with `jest-expo`
- React Native Testing Library
- NativeWind

The app uses shared React Native components, local style objects, and NativeWind configuration for utility-class styling support.

## Local Development

Install dependencies:

```sh
cd apps/mobile-app
npm install
```

Start Expo:

```sh
npm run start
```

Use SDK 54 while testing with Expo Go from the Play Store. SDK 55 can require a newer Expo Go runtime than the store has rolled out to all Android devices.

Start Expo web:

```sh
npm run web
```

Start Android emulator:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:8000/api/v1"
npm run android
```

For a physical Android phone using Expo Go, use the computer LAN IP instead:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://10.76.2.116:8000/api/v1"
npm run start
```

The backend must be reachable from the device. For a real phone, Windows Firewall may need to allow inbound access to port `8000`.
The current local mobile `.env.local` is set to `http://10.76.2.116:8000/api/v1`; update it if your PC Wi-Fi IP changes.

## API Base URL

The API client checks `EXPO_PUBLIC_API_BASE_URL` first.

If it is not set, the app tries to infer the Expo dev-server host and call:

```txt
http://<expo-host>:8000/api/v1
```

Fallbacks:

- Web: `http://<current-browser-host>:8000/api/v1`
- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator/local fallback: `http://127.0.0.1:8000/api/v1`

Do not use `localhost` for a physical device. On the phone, `localhost` means the phone itself.

## App Structure

```txt
apps/mobile-app/
|-- app/
|   |-- _layout.tsx
|   |-- index.tsx
|   |-- auth/
|   |   |-- login.tsx
|   |   `-- register.tsx
|   |-- onboarding/
|   |   |-- profile.tsx
|   |   |-- allergies.tsx
|   |   `-- goals.tsx
|   |-- tabs/
|   |   |-- _layout.tsx
|   |   |-- home.tsx
|   |   |-- supplements.tsx
|   |   |-- recommendations.tsx
|   |   `-- profile.tsx
|   |-- supplements/
|   |   |-- new.tsx
|   |   `-- [id].tsx
|   `-- recommendations/
|       `-- [runId].tsx
|-- src/
|   |-- __tests__/routes/
|   |-- components/
|   |-- features/
|   |-- lib/
|   |-- stores/
|   |-- test/
|   `-- types/
|-- app.json
`-- README.md
```

Route tests live under `src/__tests__/routes`, not under `app`. Expo Router treats files under `app` as routes, so putting `.test.tsx` files there can bundle testing libraries into the app and break Expo Go.

## Implemented Screens

### Auth

- Welcome screen
- Login
- Register
- Secure token persistence
- Logout

### Onboarding

- Profile basics
- Allergies and dietary restrictions
- Goals, activity, diet type, disliked foods

### Tabs

- Home
- Supplements
- Recommendations
- Profile

### Supplements

- List user supplements
- Add supplement
- Edit dose/frequency/time
- Delete supplement
- Loading/error/empty states

### Recommendations

- Generate recommendations
- Recommendation history
- Recommendation detail
- Explanation
- Disclaimer
- Warnings/tags
- Feedback form

## Auth Token Storage

Use Expo SecureStore for:

- access token
- refresh token

Do not store auth tokens in AsyncStorage.

## React Query Keys

Current key families:

```ts
["profile"]
["supplements"]
["user-supplements"]
["recommendations-history"]
["recommendation", runId]
```

## Testing

Run:

```sh
npm test -- --runInBand
npm run typecheck
npx expo install --check
npx expo export --platform web --clear
```

Current verified state:

- 16 test suites
- 54 tests
- Expo dependency check passes
- Expo web export passes
- Production dependency audit passes with a PostCSS override pinned to `8.5.14`

## Completion Rule

A mobile feature is complete only when:

1. Screen exists.
2. API integration exists.
3. Loading/error/empty states exist where useful.
4. Form validation exists if needed.
5. Tests pass.
6. It works against the local Docker backend.
