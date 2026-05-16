# I-NutriGuide Mobile App

Expo Router mobile app for I-NutriGuide.

## Local Development

```sh
npm install
npm run start
```

Or run it with the Docker dev stack from the repository root:

```sh
docker compose -f docker-compose.dev.yml up mobile_app
```

The Expo web app is published on `http://localhost:8081`. If you use Expo Go from a physical phone, set the LAN IP variables below so the QR code points at your host machine instead of the Docker container IP.

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

By default, the app tries to infer the Expo dev-server host and call the backend on port `8000`.
If your phone cannot reach the API, set the API URL explicitly with your computer's LAN IP:

```txt
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:8000/api/v1
REACT_NATIVE_PACKAGER_HOSTNAME=YOUR_LOCAL_IP
```

For Android emulator, use:

```txt
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1
```

Run checks:

```sh
npm test -- --runInBand
npm run typecheck
npx expo install --check
npm audit --omit=dev --audit-level=moderate
```

Current verified state:

- Tests: 54 passed
- Typecheck: passed
- Expo dependency check: passed
- Production dependency audit: 0 vulnerabilities
