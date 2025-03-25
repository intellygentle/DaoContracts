import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FundingDAO", (m) => {
  // Deploy the FundingDAO contract
  const fundingDAO = m.contract("FundingDAO", []);

  // Optional: Log the deployment address (not necessary, but nice for debugging)
  m.call(fundingDAO, "totalProposals", [], { id: "check_initial_proposals" });

  return { fundingDAO };
});