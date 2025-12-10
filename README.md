# Flow Expo Starter

A minimal React Native / Expo starter template for building mobile apps on the Flow blockchain.

## Features

- Wallet connection via WalletConnect
- Execute Cadence scripts (read from the blockchain)
- Send transactions (write to the blockchain)
- Testnet and Mainnet support

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator / Android Emulator or physical device
- A Flow wallet (e.g., [Flow Wallet](https://wallet.flow.com))

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run on your device:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan the QR code with Expo Go on your phone

## Configuration

### Changing Network

Edit `config/flow.ts` to switch between testnet and mainnet:

```typescript
export const currentNetwork = "testnet"; // Change to 'mainnet' for production
```

### Customizing App Details

Update the app details in `config/flow.ts`:

```typescript
"app.detail.title": "Your App Name",
"app.detail.url": "https://your-app.com",
"app.detail.icon": "https://your-icon-url.png",
"app.detail.description": "Your app description",
```

### WalletConnect Project ID

Get your own project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/) and update:

```typescript
"walletconnect.projectId": "your-project-id",
```

## Learn More

- [Flow Documentation](https://developers.flow.com/)
- [FCL Documentation](https://developers.flow.com/tools/clients/fcl-js)
- [Cadence Language](https://cadence-lang.org/)
- [Expo Documentation](https://docs.expo.dev/)
