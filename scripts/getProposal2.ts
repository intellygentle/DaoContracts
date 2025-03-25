import { createPublicClient, http, createWalletClient, custom, Hex, Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load env vars
dotenv.config();

// ABI from Hardhat artifacts
const artifactPath = join(__dirname, "../artifacts/contracts/dao.sol/FundingDAO.json");
const { abi } = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: Abi };

// Config
const ADDRESS_3 = process.env.ADDRESS_3 as Hex | undefined;
const RPC_URL = process.env.MONAD_RPC_URL || "https://monad-rpc-url-here";
const CONTRACT_ADDRESS = "0xb7F2E83c77C8E750fbe67dcAf678077C75D79BAF" as const;

if (!ADDRESS_3) throw new Error("ADDRESS_3 not set in .env");

// Define Monad chain
const monad = defineChain({
  id: 10143,
  name: "Monad",
  network: "monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// Clients
const publicClient = createPublicClient({
  chain: monad,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(ADDRESS_3),
  chain: monad,
  transport: custom({ request: async (args) => publicClient.request(args) }),
});

const contract = { address: CONTRACT_ADDRESS, abi } as const;

// Helper to convert wei to MON
const weiToMon = (wei: bigint): string => {
  const mon = Number(wei) / 1e18;
  return mon.toFixed(4);
};

async function getAllProposals() {
  const totalProposals = await publicClient.readContract({
    ...contract,
    functionName: "totalProposals",
    args: [],
  }) as bigint;

  console.log(`Total Proposals: ${totalProposals}`);

  const proposalVotes: { id: bigint; yesVotes: bigint; description: string; proposer: `0x${string}` }[] = [];
  let highestVoteCount = 0n;
  let highestVotedProposals: bigint[] = [];

  for (let i = 0n; i < totalProposals; i++) {
    const proposal = await publicClient.readContract({
      ...contract,
      functionName: "proposals",
      args: [i],
    }) as [string, `0x${string}`, bigint, bigint, bigint, boolean, `0x${string}`];

    const [description, nominee, deadline, yesVotes, noVotes, executed, proposer] = proposal;
    const formattedDeadline = new Date(Number(deadline) * 1000).toLocaleString();

    console.log(`Proposal ID: ${i}`);
    console.log(`  Description: ${description}`);
    console.log(`  Nominee: ${nominee}`);
    console.log(`  Proposer: ${proposer}`);
    console.log(`  Deadline: ${formattedDeadline}`);
    console.log(`  Yes Votes: ${weiToMon(yesVotes)} MON`);
    console.log(`  No Votes: ${weiToMon(noVotes)} MON`);
    console.log(`  Executed: ${executed}`);
    console.log("---");

    proposalVotes.push({ id: i, yesVotes, description, proposer });

    if (yesVotes > highestVoteCount) {
      highestVoteCount = yesVotes;
      highestVotedProposals = [i];
    } else if (yesVotes === highestVoteCount) {
      highestVotedProposals.push(i);
    }
  }

  if (proposalVotes.length > 0) {
    console.log("Proposal(s) with the Highest Yes Votes:");
    highestVotedProposals.forEach((id) => {
      const winner = proposalVotes.find((p) => p.id === id)!;
      console.log(`  ID: ${id}`);
      console.log(`  Description: ${winner.description}`);
      console.log(`  Proposer: ${winner.proposer}`);
      console.log(`  Yes Votes: ${weiToMon(winner.yesVotes)} MON`);
      console.log("---");
    });
  } else {
    console.log("No proposals yet!");
  }
}

async function debugProposalVotes(proposalId: bigint, wallets: `0x${string}`[]) {
  console.log(`Debugging Votes for Proposal ID: ${proposalId}`);

  for (const wallet of wallets) {
    const votingPower = await publicClient.readContract({
      ...contract,
      functionName: "votingPower",
      args: [wallet],
    }) as bigint;

    const depositedAmount = await publicClient.readContract({
      ...contract,
      functionName: "depositedAmount",
      args: [wallet],
    }) as bigint;

    const stakedAmount = await publicClient.readContract({
      ...contract,
      functionName: "stakedAmount",
      args: [wallet],
    }) as bigint;

    const hasVoted = await publicClient.readContract({
      ...contract,
      functionName: "hasVoted",
      args: [proposalId, wallet],
    }) as boolean;

    console.log(`Wallet: ${wallet}`);
    console.log(`  Voting Power: ${weiToMon(votingPower)} MON`);
    console.log(`  Deposited Amount: ${weiToMon(depositedAmount)} MON`);
    console.log(`  Staked Amount: ${weiToMon(stakedAmount)} MON`);
    console.log(`  Has Voted: ${hasVoted}`);
    console.log("---");
  }
}

async function main() {
  await getAllProposals();

  const wallets = [
    "0xE47E1B9DfAE1F4324FF32bC713C0CE28b5bB593c",
    "0x88bA1c4b39b1FBa1E60Cc9f94DF96DdB1b8B55e1",
    "0xCB7EBa3D69f242b29FECD06AB7aEE0E61Dd60c9D",
    "0x644429776367A1bDd8350D99897726B295D8fBcc",
  ] as `0x${string}`[];
  await debugProposalVotes(BigInt(3), wallets);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});