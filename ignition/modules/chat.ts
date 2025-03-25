import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MessageBoard", (m) => {
  // Address of the already deployed FundingDAO contract
  const fundingDAOAddress = "0xb7F2E83c77C8E750fbe67dcAf678077C75D79BAF";

  // Deploy the MessageBoard contract with fundingDAO address as constructor argument
  const messageBoard = m.contract("MessageBoard", [fundingDAOAddress]);

  return { messageBoard };
});
