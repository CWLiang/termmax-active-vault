# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Wallet connection (wagmi)

This app uses [wagmi](https://wagmi.sh/) + the **injected** connector (MetaMask, Rabby, etc.). Default chains are **Ethereum mainnet** and **Sepolia** (`src/lib/wagmi.ts`). For reliable RPC access, copy `.env.example` to `.env` and set `VITE_RPC_URL_MAINNET` / `VITE_RPC_URL_SEPOLIA` if needed.

## Strategy Vault API

Vault list, detail, NAV history, allocations, risk, activity, and user positions are loaded from the **TermMax Strategy Vault API**. Vault URLs are `/vault/{chainId}/{mTokenAddress}` (EIP-55 checksummed address).

### Local dev and CORS

`curl` can call the API directly, but browsers enforce **CORS**. In **`npm run dev`**, requests default to same-origin **`/termmax-api`**, which Vite proxies to Render (see `vite.config.ts`). You normally **do not** need `VITE_API_BASE_URL` locally.

For **production** builds hosted on another domain, the API must return `Access-Control-Allow-Origin` for that origin, **or** you front the API behind your own same-origin proxy.

Set `VITE_API_BASE_URL` only when you intentionally want the browser to call that URL directly (and CORS is configured).

## Curator Console routes

- `/curator-console` — list strategy vaults from the API; **Manage** opens tools for that vault.
- `/curator-console/vault/:chainId/:mTokenAddress/overview|nav|redemption|deposit|audit-log` — per-vault curator tools (sidebar appears after you enter a vault).

Legacy paths (`/curator-console/vault-overview`, etc.) redirect to the vault list.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
