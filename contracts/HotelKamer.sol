// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
import "@openzeppelin/contracts/access/Ownable.sol";

contract HotelKamer is Ownable {
    enum KamerStatus {Vrij, Geboekt, Onbeschikbaar}

    struct Kamer {
        uint256 Nummer;
        KamerStatus Status;
        uint256 Prijs; // in wei
    }

    Kamer public kamer;

    constructor() public {
        kamer.Status = KamerStatus.Vrij;
        kamer.Prijs = 0.1 ether;
    }

    modifier BetalingHogerDanPrijs(uint256 _betaling) {
        require(_betaling >= kamer.Prijs, "betaling is minder dan de prijs");
        _;
    }
    modifier KamerMoetVrijZijn() {
        require(kamer.Status == KamerStatus.Vrij, "Kamer is niet vrij");
        _;
    }

    function ZetPrijs(uint256 _prijs) public onlyOwner {
        kamer.Prijs = _prijs;
    }

    function ZetGeboekt() public onlyOwner {
        kamer.Status = KamerStatus.Geboekt;
    }

    function ZetVrij() public onlyOwner {
        kamer.Status = KamerStatus.Vrij;
    }

    function MaakBoeking()
        public
        payable
        BetalingHogerDanPrijs(msg.value)
        KamerMoetVrijZijn
    {
        kamer.Status = KamerStatus.Geboekt;
        //  emit Received(msg.sender, msg.value);
    }

    function ToonBalans() public view returns (uint256) {
        return address(this).balance;
    }
}
