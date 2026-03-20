import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useVaultListData } from "@/hooks/queries/useVaultListData";
import { normalizeVaultAddress } from "@/lib/evmAddress";

export function useCuratorVaultParams() {
  const { chainId: c, address } = useParams<{ chainId: string; address: string }>();
  const chainId = c ? parseInt(c, 10) : NaN;
  const mTokenAddress = address ?? "";
  const valid = Number.isFinite(chainId) && mTokenAddress.startsWith("0x");
  return { chainId, mTokenAddress, valid };
}

/** Resolves the current vault from the public list (same source as the picker). */
export function useCuratorVaultSummary() {
  const { chainId, mTokenAddress, valid } = useCuratorVaultParams();
  const { data } = useVaultListData();

  const vault = useMemo(() => {
    if (!valid || !data?.vaults?.length) return undefined;
    const want = normalizeVaultAddress(mTokenAddress);
    return data.vaults.find((v) => v.chainId === chainId && normalizeVaultAddress(v.mTokenAddress) === want);
  }, [valid, data?.vaults, chainId, mTokenAddress]);

  return { chainId, mTokenAddress, valid, vault };
}
