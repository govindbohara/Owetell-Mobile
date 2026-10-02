# Owetell

Owetell is a mobile app for splitting shared costs with housemates, friends or travel groups. Create a room, invite people, log who paid for what, and Owetell works out who owes whom.

It's built with [Expo](https://expo.dev) (React Native) and uses [Firebase](https://firebase.google.com) for sign-in and data storage. It runs on iOS, Android and the web.

## Features

- **Accounts:** sign up with email and password, or with Google. Each user picks a unique username.
- **Rooms:** a shared space for a group. Invite people with a link or QR code, manage members and roles, transfer ownership, and leave or delete rooms. Deleted rooms can be restored.
- **Expenses:** record who paid and who the cost is split between. Edit, delete and restore expenses.
- **Balances and settle up:** see each person's net balance (owed or owing) and record payments between members.
- **Subscriptions:** track recurring costs (weekly, monthly, quarterly or yearly), see when the next payment is due, and confirm each charge.
- **Analytics:** spending breakdowns for your rooms.

## Tech stack

| Area | What's used |
| --- | --- |
| App framework | Expo SDK 57, React Native, React 19 |
| Navigation | Expo Router (file-based routing) |
| Backend | Firebase Authentication and Cloud Firestore |
| Google sign-in | `expo-auth-session` |
| Validation | Zod |
| Language | TypeScript |

## Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org) (LTS version)
- A Firebase project with **Authentication** (Email/Password and Google) and **Cloud Firestore** turned on
- For running on a device or simulator: Xcode (iOS) or Android Studio (Android)

### 2. Install dependencies

```bash
npm install
```

### 3. Add your environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Where to find it |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase Console → Project settings → Your apps → Web app config |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |

The Google client IDs are only needed for Google sign-in on iOS and Android. The web version uses Firebase's popup sign-in instead.

> `.env` is listed in `.gitignore`, so it is never committed. Note that `EXPO_PUBLIC_*` values are built into the app, so anyone with the app can read them. Your Firestore security rules are what keep the data safe.

### 4. Deploy the Firestore security rules

The rules live in `assets/1.rules`. Paste them into Firebase Console → Firestore Database → Rules, or deploy them with the Firebase CLI.

### 5. Run the app

```bash
npm run ios       # build and run on the iOS simulator
npm run android   # build and run on an Android emulator or device
npm run web       # run in the browser
npm start         # start the dev server for an existing development build
```

The project uses a [development build](https://docs.expo.dev/develop/development-builds/introduction/) (`expo-dev-client`), so the first `npm run ios` or `npm run android` compiles the native app. That can take a few minutes.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Starts the Expo dev server |
| `npm run ios` | Builds and runs the native iOS app |
| `npm run android` | Builds and runs the native Android app |
| `npm run web` | Runs the app in a web browser |
| `npm run go` | Starts the dev server for Expo Go, with a cleared cache |
| `npm run lint` | Checks the code with ESLint |
| `npm run reset-project` | ⚠️ Expo starter script that moves the app code aside. Don't run it unless you want to start over. |

## Project structure

```
src/
├── app/            Screens. Each file is a route (Expo Router)
│   ├── login.tsx         Sign in / sign up
│   ├── onboarding.tsx    Choose a username after first sign-in
│   └── private/          Screens for signed-in users
│       ├── index.tsx         Home: your rooms
│       ├── room/[id].tsx     A single room: expenses, balances, members
│       ├── subs.tsx          Subscriptions
│       └── analytics.tsx     Spending analytics
├── components/     Reusable UI: sheets, rows, cards, tab bar
├── config/         Firebase setup (separate native and web versions)
├── contexts/       App-wide state: auth and rooms
├── utils/          Firestore API calls, balance and billing maths, formatting
├── constants/      Theme colours and fonts
├── hooks/          Custom React hooks
└── data/           Shared types and sample data
assets/
├── images/         App icons and splash images
└── 1.rules         Firestore security rules
```

## How it works

- **Sign-in flow:** `src/app/_layout.tsx` decides which screens you can reach. Signed-out users see the login screen, new users choose a username, and everyone else gets the main app.
- **Money is stored in cents** (whole numbers) to avoid rounding errors. Amounts are shown in AUD by default.
- **Balances:** `src/utils/balances.ts` adds up every expense and settlement in a room. A positive balance means the person is owed money, and a negative balance means they owe.
- **Soft deletes:** deleted rooms and expenses are marked as deleted first, so they can be restored.

## License

See [LICENSE](LICENSE).
