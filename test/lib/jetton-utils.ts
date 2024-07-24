import BN from "bn.js";
import { Address, Cell, Slice } from "ton";
import { JettonMetaDataKeys, parseTokenMetadataCell } from "../../build/jetton-minter.deploy";

interface JettonDetails {
  totalSupply: BN;
  address: Address;
  metadata: { [s in JettonMetaDataKeys]?: string };
  name: string;
  symbol: string;
  decimals: BN;
  chainId: BN;
  baseToken: BN;
}
export function parseJettonDetails(execResult: { result: any[] }): JettonDetails {
  return {
    totalSupply: execResult.result[0] as BN,
    address: (execResult.result[2] as Slice).readAddress() as Address,
    metadata: parseTokenMetadataCell(execResult.result[3]),
    name: (execResult.result[5] as Cell).bits.buffer.toString(),
    symbol: (execResult.result[6] as Cell).bits.buffer.toString(),
    decimals: execResult.result[7] as BN,
    chainId: execResult.result[8] as BN,
    baseToken: execResult.result[9] as BN,
  };
}

export function getWalletAddress(stack: any[]): Address {
  return stack[0][1].bytes[0].beginParse().readAddress()!;
}

interface JettonWalletDetails {
  balance: BN;
  owner: Address;
  jettonMasterContract: Address; // Minter
}

export function parseJettonWalletDetails(execResult: { result: any[] }): JettonWalletDetails {
  return {
    balance: execResult.result[0] as BN,
    owner: (execResult.result[1] as Slice).readAddress()!,
    jettonMasterContract: (execResult.result[2] as Slice).readAddress()!,
  };
}
