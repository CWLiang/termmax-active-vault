/**
 * Minimal DepositVault ABI for supply cap display.
 */
export const depositVaultAbi = [
  {
    type: "function",
    name: "maxSupplyCap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "maxSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
] as const;
