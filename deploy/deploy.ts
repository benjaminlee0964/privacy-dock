import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivacyDock = await deploy("PrivacyDock", {
    from: deployer,
    log: true,
  });

  console.log(`PrivacyDock contract: `, deployedPrivacyDock.address);
};
export default func;
func.id = "deploy_privacyDock"; // id required to prevent reexecution
func.tags = ["PrivacyDock"];
