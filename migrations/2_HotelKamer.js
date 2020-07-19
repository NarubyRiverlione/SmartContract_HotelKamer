const HotelKamer = artifacts.require("HotelKamer");

module.exports = function (deployer) {
  deployer.deploy(HotelKamer);
  /*
  // huidige versie ==> op pauze zetten
  HotelKamer.deployed()
    .then(OudKamerContract => {
      console.log(`Oud contract adres = ${OudKamerContract.address}`)
      OudKamerContract.HandRem()
    })
    .then(() => {
      // nieuwe versie ==> deploy
      deployer.deploy(HotelKamer);
      HotelKamer.deployed()
    })
    .then((NieuwKamerContract) => {
      console.log(`Nieuw contract adres = ${NieuwKamerContract.address}`)
    })
    */
}