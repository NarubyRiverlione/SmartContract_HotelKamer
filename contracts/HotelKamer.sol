// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract HotelKamer is Ownable, Pausable {
    using SafeMath for uint256;

    enum KamerStatus {Vrij, Geboekt, Onbeschikbaar}

    struct Kamer {
        uint256 Nummer;
        KamerStatus Status;
        uint256 Prijs; // in wei
        uint256 AantalGeboekteDagen;
        address Boeker;
    }

    Kamer public kamer;

    constructor() public Pausable() {
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

    function ZetPrijs(uint256 _prijs) external onlyOwner whenNotPaused() {
        kamer.Prijs = _prijs;
    }

    function ZetGeboekt() external onlyOwner whenNotPaused() {
        kamer.Status = KamerStatus.Geboekt;
    }

    function ZetVrij() external onlyOwner whenNotPaused() {
        kamer.Status = KamerStatus.Vrij;
    }

    function Reset() public onlyOwner {
        if (paused()) _unpause();
        kamer.Status = KamerStatus.Vrij;
        kamer.Prijs = 0.1 ether;
        kamer.AantalGeboekteDagen = 0;
        kamer.Boeker = address(this); // default to contract address
    }

    function MaakBoeking()
        external
        payable
        BetalingHogerDanPrijs(msg.value)
        KamerMoetVrijZijn
        whenNotPaused()
    {
        kamer.Status = KamerStatus.Geboekt;
        kamer.AantalGeboekteDagen = SafeMath.div(msg.value, kamer.Prijs);
        kamer.Boeker = msg.sender;
    }

    function Uitbetaling() external onlyOwner() {
        // (bool success, ) = msg.sender.call{value: address(this).balance}("");
        bool success = msg.sender.send(address(this).balance);
        require(success, "Transfer failed.");
    }

    function OpenDeur()
        external
        BeschikbareGeboekteDagen
        EnkelDoorBoeker
        whenNotPaused()
    {
        kamer.AantalGeboekteDagen = SafeMath.sub(kamer.AantalGeboekteDagen, 1);
        if (kamer.AantalGeboekteDagen == 0) {
            kamer.Status = KamerStatus.Vrij;
            kamer.Boeker = address(this); // default to contract address
        }
    }

    function HandRem() external onlyOwner() {
        _pause();
    }
}
