/**
 * Minimal IManageableVault ABI — resolve mToken DataFeed for NAV / oracle settings.
 */
export const manageableVaultAbi = [
  {
    type: "function",
    name: "mTokenDataFeed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
  {
    type: "function",
    name: "feeReceiver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
  {
    type: "function",
    name: "tokensReceiver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
] as const;
