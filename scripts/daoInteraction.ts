import { createPublicClient, http, createWalletClient, custom, Hex, Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem"
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load env vars
dotenv.config();

// ABI from Hardhat artifacts
const artifactPath = join(__dirname, "../artifacts/contracts/dao.sol/FundingDAO.json");
const { abi } = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: Abi };

// Config
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex | undefined;
const RPC_URL = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";
const CONTRACT_ADDRESS = "0x87C2b9624aE138e5Bec3225697c713B99Df6A11c" as const;

if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in .env");

// Define Somnia chain
const somnia = defineChain({
  id: 50312,
  name: "somnia",
  network: "Somnia",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// Clients
const publicClient = createPublicClient({
  chain: somnia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: somnia,
  transport: custom({ request: async (args) => publicClient.request(args) }),
});

const contract = { address: CONTRACT_ADDRESS, abi } as const;

// Helper to convert wei to STT
const weiToSTT = (wei: bigint): string => {
  const STT = Number(wei) / 1e18;
  return STT.toFixed(4); // 4 decimal places for readability
};

// Interaction Functions
async function deposit(amount: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "deposit",
    value: amount,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Deposited ${weiToSTT(amount)} STT - Tx: ${tx}`);
  return receipt;
}

async function stake(amount: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "stake",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Staked ${weiToSTT(amount)} STT - Tx: ${tx}`);
  return receipt;
}

async function unstake(amount: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "unstake",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Unstaked ${weiToSTT(amount)} STT - Tx: ${tx}`);
  return receipt;
}

async function makeMeWorthy() {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "makeMeWorthy",
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Marked as worthy - Tx: ${tx}`);
  return receipt;
}

async function createProposal(description: string, nominee: `0x${string}`) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "createProposal",
    args: [description, nominee],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Created proposal for ${nominee} - Tx: ${tx}`);
  return receipt;
}

async function vote(proposalId: bigint, support: boolean) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "vote",
    args: [proposalId, support],
    value: BigInt("1000000000000000"), // 0.001 STT
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Voted ${support ? "yes" : "no"} on proposal ${proposalId} - Tx: ${tx}`);
  return receipt;
}

async function whitelistAddress(proposalId: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "whitelistAddress",
    args: [proposalId],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Whitelisted proposal ${proposalId} - Tx: ${tx}`);
  return receipt;
}

async function executeProposal(proposalId: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "executeProposal",
    args: [proposalId],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Executed proposal ${proposalId} - Tx: ${tx}`);
  return receipt;
}

async function markFundsReturned() {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "markFundsReturned",
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Marked funds returned - Tx: ${tx}`);
  return receipt;
}

async function withdrawVoteDeposit() {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "withdrawVoteDeposit",
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Withdrew vote deposit - Tx: ${tx}`);
  return receipt;
}

async function withdrawDeposit(amount: bigint) {
  const tx = await walletClient.writeContract({
    ...contract,
    functionName: "withdrawDeposit",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Withdrew ${weiToSTT(amount)} STT deposit - Tx: ${tx}`);
  return receipt;
}

async function getBalance() {
  const balance = await publicClient.readContract({
    ...contract,
    functionName: "getBalance",
    args: [],
  }) as bigint;
  console.log(`Contract balance: ${weiToSTT(balance)} STT`);
  return balance;
}
// Example usage
async function main() {
  const amount = BigInt("1000000000000000"); // 0.001 STT in wei
  // await deposit(amount);
  // await stake(amount);
  // await makeMeWorthy();
  // await createProposal("Fund my project", walletClient.account.address);
  // await vote(BigInt(0), true);
  //  await getBalance();
  // Uncomment deployer-only functions if using deployer key
  await whitelistAddress(BigInt(0));
  await executeProposal(BigInt(0));
  // await markFundsReturned();
  //await withdrawVoteDeposit();
  //await unstake(amount);
  //await withdrawDeposit(amount);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
