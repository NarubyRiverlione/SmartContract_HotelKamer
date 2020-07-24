// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./SafeMath8.sol";

contract HotelKamer is Ownable, Pausable {
    using SafeMath for uint256;
    using SafeMath8 for uint8;

    //  enum KamerStatus {Vrij, Geboekt, Onbeschikbaar}

    struct Kamer {
        //  uint8 Nummer;
        uint8 AantalGeboekteDagen;
        uint256 Prijs; // in wei
        bool Beschikbaar;
        address Boeker;
    }

    Kamer public kamer;

    constructor() public Pausable() {
        kamer.Beschikbaar = true;
        kamer.Prijs = 0.1 ether;
        kamer.AantalGeboekteDagen = 0;
        kamer.Boeker = address(this); // default to contract address
    }

    modifier BetalingHogerDanPrijs(uint256 _betaling) {
        require(_betaling >= kamer.Prijs, "betaling is minder dan de prijs");
        _;
    }
    modifier KamerMoetVrijZijn() {
        require(kamer.Beschikbaar, "Kamer is niet vrij");
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
        kamer.Beschikbaar = false;
    }

    function ZetVrij() external onlyOwner whenNotPaused() {
        kamer.Beschikbaar = true;
    }

    function Reset() public onlyOwner {
        if (paused()) _unpause();
    }

    function MaakBoeking()
        external
        payable
        whenNotPaused()
        KamerMoetVrijZijn
        BetalingHogerDanPrijs(msg.value)
    {
        kamer.Beschikbaar = false;
        kamer.AantalGeboekteDagen = uint8(SafeMath.div(msg.value, kamer.Prijs));
        kamer.Boeker = msg.sender;
    }

    function Uitbetaling() external onlyOwner() {
        bool success = msg.sender.send(address(this).balance);
        require(success, "Transfer failed.");
    }

    /* volgorde van de modifiers is belangrijk !
   Als laatste geboekte dag is opgebruikt zal de Boeker op de contract adres gezet worden (null bestaat niet in Solidity)
   Dus moet BeschikbareGeboekteDagen gecheckt worden voor EnkelDoorBoeker
 */
    function OpenDeur()
        external
        whenNotPaused()
        BeschikbareGeboekteDagen
        EnkelDoorBoeker
    {
        // TODO SafeMath8
        kamer.AantalGeboekteDagen--;
        if (kamer.AantalGeboekteDagen == 0) {
            kamer.Beschikbaar = true;
            kamer.Boeker = address(this); // default to contract address
        }
    }

    function HandRem() external onlyOwner() {
        _pause();
    }
}
