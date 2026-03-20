/**
 * DataFeed.sol — healthyDiff / expected answer bounds + setters (feed admin).
 * @see midas-contract-interface/DataFeed.sol
 */
export const dataFeedAbi = [
  {
    type: "function",
    name: "aggregator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
  {
    type: "function",
    name: "healthyDiff",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
  },
  {
    type: "function",
    name: "minExpectedAnswer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "int256", name: "" }],
  },
  {
    type: "function",
    name: "maxExpectedAnswer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "int256", name: "" }],
  },
  {
    type: "function",
    name: "setHealthyDiff",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "_healthyDiff" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setMinExpectedAnswer",
    stateMutability: "nonpayable",
    inputs: [{ type: "int256", name: "_minExpectedAnswer" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setMaxExpectedAnswer",
    stateMutability: "nonpayable",
    inputs: [{ type: "int256", name: "_maxExpectedAnswer" }],
    outputs: [],
  },
] as const;

/** Chainlink AggregatorV3Interface.decimals() for human-readable hints next to raw answers. */
export const aggregatorV3DecimalsAbi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
  },
] as const;

/** AggregatorV3Interface.latestRoundData — CustomAggregatorV3CompatibleFeed / Chainlink feeds. */
export const aggregatorV3LatestRoundDataAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;
