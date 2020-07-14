// SPDX-License-Identifier: MIT
pragma solidity ^0.6.9;
import "@openzeppelin/contracts/access/Ownable.sol";

contract HotelKamer is Ownable {
    enum KamerStatus {Vrij, Geboekt, Onbeschikbaar}

    struct Kamer {
        uint256 Nummer;
        KamerStatus Status;
        uint256 Prijs; // in wei
        uint256 AantalGeboekteDagen;
        address Boeker;
    }

    Kamer public kamer;

    constructor() public {
        Reset();
    }

    modifier BetalingHogerDanPrijs(uint256 _betaling) {
        require(_betaling >= kamer.Prijs, "betaling is minder dan de prijs");
        _;
    }
    modifier KamerMoetVrijZijn() {
        require(kamer.Status == KamerStatus.Vrij, "Kamer is niet vrij");
        _;
    }
    modifier BeschikbareGeboekteDagen() {
        require(
            kamer.AantalGeboekteDagen > 0,
            "Alle geboekte dagen zijn opgebruikt"
        );
        _;
    }
    modifier EnkelDoorBoeker() {
        require(
            msg.sender == kamer.Boeker,
            "Enkel de boeker mag deze actie doen"
        );
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

    function Reset() public onlyOwner {
        kamer.Status = KamerStatus.Vrij;
        kamer.Prijs = 0.1 ether;
        kamer.AantalGeboekteDagen = 0;
        kamer.Boeker = address(this); // default to contract address
    }

    function MaakBoeking()
        public
        payable
        BetalingHogerDanPrijs(msg.value)
        KamerMoetVrijZijn
    {
        kamer.Status = KamerStatus.Geboekt;
        kamer.AantalGeboekteDagen = msg.value / kamer.Prijs;
        kamer.Boeker = msg.sender;
    }

    function ToonBalans() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function Uitbetaling() public onlyOwner() {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function OpenDeur() public BeschikbareGeboekteDagen EnkelDoorBoeker {
        kamer.AantalGeboekteDagen -= 1;
    }
}
