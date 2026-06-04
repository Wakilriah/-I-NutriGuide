# I-NutriGuide Mobile App

Expo Router mobile app for I-NutriGuide.

## Local Development

```sh
npm install
npm run start
```

For testing on a physical phone over the same Wi-Fi/LAN, start Expo with the host machine LAN IP:

```sh
npm run start:lan
```

The LAN starter writes `.env.local` with `EXPO_PUBLIC_API_BASE_URL=http://<lan-ip>:8000/api/v1`, sets `REACT_NATIVE_PACKAGER_HOSTNAME`, and starts Expo on port `8081`. Production API calls should use the API subdomain, not a raw IP address.

The app includes:

- Welcome screen
- Login screen
- Register screen
- Profile onboarding
- Allergies, restrictions, goals, and disliked foods
- Tabs for Home, Supplements, Recommendations, and Profile
- User supplement list/add/edit/delete flow
- Recommendation generation, history, detail, disclaimer, warnings, and feedback
- Axios API client
- Zustand auth store
- Expo SecureStore token persistence
- React Query provider
- NativeWind configuration

By default, the app uses the production API domain when `EXPO_PUBLIC_API_BASE_URL` is not set. For deployed builds, keep the API URL on the backend subdomain:

```txt
EXPO_PUBLIC_API_BASE_URL=https://api.matchcesoir.pro/api/v1
```

For local development, prefer a local DNS name that resolves to your machine instead of a hard-coded IP:

```txt
EXPO_PUBLIC_API_BASE_URL=http://api.localhost:8000/api/v1
```

Run checks:

```sh
npm test -- --runInBand
npm run typecheck
npx expo install --check
npm audit --omit=dev --audit-level=moderate
```

Current verified state:

- Tests: 72 passed
- Typecheck: passed
- Expo dependency check: passed
- Production dependency audit: 0 vulnerabilities
