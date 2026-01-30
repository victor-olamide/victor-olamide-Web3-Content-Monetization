import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const BaseContentMonetization = await ethers.getContractFactory("BaseContentMonetization");
  const bcm = await BaseContentMonetization.deploy();
  await bcm.waitForDeployment();
  console.log("BaseContentMonetization deployed to:", await bcm.getAddress());

  const ContentGating = await ethers.getContractFactory("ContentGating");
  const gating = await ContentGating.deploy();
  await gating.waitForDeployment();
  console.log("ContentGating deployed to:", await gating.getAddress());

  const Subscription = await ethers.getContractFactory("Subscription");
  const sub = await Subscription.deploy();
  await sub.waitForDeployment();
  console.log("Subscription deployed to:", await sub.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
