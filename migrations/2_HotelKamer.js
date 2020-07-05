const HotelKamer = artifacts.require("HotelKamer");

module.exports = function (deployer) {
  // deployment steps
  deployer.deploy(HotelKamer);
};