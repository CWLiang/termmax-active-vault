/**
 * CustomAggregatorV3CompatibleFeed — manual NAV / price submissions (feed admin).
 * @see midas-contract-interface/CustomAggregatorV3CompatibleFeed.sol
 */
export const customAggregatorV3CompatibleFeedAbi = [
  {
    type: "function",
    name: "setRoundDataSafe",
    stateMutability: "nonpayable",
    inputs: [{ name: "_data", type: "int256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setRoundData",
    stateMutability: "nonpayable",
    inputs: [{ name: "_data", type: "int256" }],
    outputs: [],
  },
] as const;
