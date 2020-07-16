
const { balance } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const KamerContract = artifacts.require('HotelKamer')
const ERR_REQUIRE = 'Error: Returned error: VM Exception while processing transaction:'

contract('HotelKamer', (accounts) => {
  let kamerContract
  const StandaardPrijs = web3.utils.toWei('0.1', 'ether')

  before(async () => {
    kamerContract = await KamerContract.deployed()
    console.log(`Contract adres = ${kamerContract.address}`)
  })
  beforeEach(async () => {
    await kamerContract.Reset()
  })

  describe('Initiële contract waarden', () => {
    it('Waarden na reset', async () => {
      const kamer = await kamerContract.kamer.call()
      assert.equal(StandaardPrijs, kamer.Prijs, 'Prijs van een nieuwe kamer is niet 0.1 Eth')
      assert.equal(0, kamer.Status.toString(), 'Status van een nieuwe kamer is niet vrij')
      assert.equal(kamerContract.address, kamer.Boeker, 'De Boeker moet standaard het adres van het contract zijn')
      assert.equal(0, kamer.AantalGeboekteDagen, 'Aantal geboekte dagen moet 0 zijn')
    })

  })

  describe('Zet de Prijs', () => {
    it('Zet kamer prijs', async () => {
      // TODO random prijs
      await kamerContract.ZetPrijs(123456789)
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Prijs, 123456789, 'Prijs van een  kamer moet nu 123456789 zijn')
    })
    it('Een niet-eigenaar kan de prijs niet aanpassen', async () => {
      try {
        await kamerContract.ZetPrijs(789, { from: accounts[2] })// als niet-eigenaar --> moet foutmelding geven
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(StandaardPrijs.toString(), kamer.Prijs.toString(), 'Prijs moet nog 10 zijn')
        assert.equal(kamerContract.address, kamer.Boeker, 'Standaard is Boeker = contract adres')
      }
    })
  })

  describe('Zet status Geboekt', () => {
    it('Zet kamer geboekt', async () => {
      await kamerContract.ZetGeboekt()
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Status, 1, 'Status moet nu geboekt (1) zijn ')
    })
    it('Een niet-eigenaar kan kamer niet op geboekt zetten', async () => {
      try {
        await kamerContract.ZetGeboekt({ from: accounts[1] }) // als niet-eigenaar --> moet foutmelding geven
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(0, kamer.Status.toString(), 'Status moet nog steeds vrij (0) zijn ')
        assert.equal(kamerContract.address, kamer.Boeker, 'Standaard is Boeker = contract adres')
      }
    })
  })

  describe('Zet status Vrij', () => {
    it('Een niet-eigenaar kan kamer niet op vrij zetten', async () => {
      try {
        await kamerContract.ZetGeboekt() // als contract eigenaar om een zeker start situatie te hebben
        await kamerContract.ZetVrij({ from: accounts[1] }) // als niet-eigenaar --> moet foutmelding geven
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Status, 1, 'Status moet nog steeds geboekt (1) zijn ')
      }
    })
  })

  describe('Maak een boeking', () => {
    it('Boek kamer voor 1 dag (betaling = prijs)', async () => {
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')
      await kamerContract.MaakBoeking({ value: StandaardPrijs, from: accounts[1] })

      const kamer = await kamerContract.kamer.call()
      assert.equal(1, kamer.Status, 'Status moet nu geboekt (1) zijn ')
      assert.equal(1, kamer.AantalGeboekteDagen, 'Aantal geboekte dagen moet 1 zijn')
      assert.equal(accounts[1], kamer.Boeker, 'Adres van Boeker is niet juist')
      const delta = await tracker.delta()
      assert.equal(StandaardPrijs.toString(), delta.toString(), 'Niet het juiste bedrag ontvangen')
    })
    it('Boek kamer voor 3 dagen (betaling * 3 = prijs)', async () => {
      const boekingBedrag = StandaardPrijs * 3

      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')

      await kamerContract.MaakBoeking({ value: boekingBedrag, from: accounts[1] })

      const kamer = await kamerContract.kamer.call()
      assert.equal(1, kamer.Status, 'Status moet nu geboekt (1) zijn ')
      assert.equal(3, kamer.AantalGeboekteDagen.toString(), 'Aantal geboekte dagen moet 3 zijn')
      assert.equal(accounts[1], kamer.Boeker, 'Adres van Boeker is niet juist')
      const delta = await tracker.delta()
      assert.equal(boekingBedrag.toString(), delta.toString(), 'Niet het juiste bedrag ontvangen')
    })

    it('Boek kamer met onvoldoende betaling => kamer blijft vrij, niets ontvangen', async () => {
      const boekingBedrag = web3.utils.toWei('0.08', 'ether')
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')
      try {
        await kamerContract.MaakBoeking({ value: boekingBedrag, from: accounts[4] })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert betaling is minder dan de prijs -- Reason given: betaling is minder dan de prijs.', 'Foutmelding niet juist')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(0, kamer.Status.toString(), 'Status moet nog vrij (0) zijn ')
        assert.equal(0, kamer.AantalGeboekteDagen.toString(), 'Aantal geboekte dagen moet 0 zijn')
        assert.equal(kamerContract.address, kamer.Boeker, 'Standaard is Boeker = contract adres')
        const delta = await tracker.delta()
        assert.equal(0, delta, 'Contract mag niets ontvangen hebben want de transactie is niet doorgegaan')
      }
    })
    it('Bezette kamer boeken kan niet', async () => {
      await kamerContract.ZetGeboekt()
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')
      try {
        await kamerContract.MaakBoeking({ value: StandaardPrijs })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Kamer is niet vrij -- Reason given: Kamer is niet vrij.', 'Foutmelding niet juist')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Status, 1, 'Status moet nu steeds geboekt (1) zijn ')
        assert.equal(0, kamer.AantalGeboekteDagen.toString(), 'Aantal geboekte dagen moet 0 zijn')
        assert.equal(kamerContract.address, kamer.Boeker, 'Standaard is Boeker = contract adres')
        const delta = await tracker.delta()
        assert.equal(0, delta, 'Contract mag niets ontvangen hebben want de transactie is niet doorgegaan')
      }
    })
    it('Stuur Eth naar contract, niet naar specifieke MaakBoeking functie ==> mag niet lukken', async () => {
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')

      try {
        const result = await kamerContract.send(web3.utils.toWei('1', 'ether'))
        assert.equal('', result, 'onverwacht resultaat')
      }
      catch (fout) {
        assert.equal(fout, ERR_REQUIRE + ' revert', 'Foutmelding niet juist')
        const delta = await tracker.delta()
        assert.equal(0, delta, 'Contract mag niets ontvangen hebben want de transactie is niet doorgegaan')
      }
    })
  })

  describe('Gebruik geboekte dagen', () => {
    it('Boek 1 dag, open deur 1x', async () => {
      await kamerContract.MaakBoeking({ value: StandaardPrijs, from: accounts[1] })
      await kamerContract.OpenDeur({ from: accounts[1] })
      const kamer = await kamerContract.kamer.call()
      assert.equal(0, kamer.AantalGeboekteDagen, 'Na 1x deur openen moet aantal beschikbare dagen 0 zijn')
      assert.equal(0, kamer.Status.toString(), 'De kamer moet terug vrij zijn')
      assert.equal(kamerContract.address, kamer.Boeker, 'Standaard is Boeker = contract adres')

    })
    it('Boek 2 dagen, open deur 3x moet fout geven', async () => {
      try {
        await kamerContract.MaakBoeking({ value: StandaardPrijs * 2, from: accounts[1] })
        await kamerContract.OpenDeur({ from: accounts[1] })

        const kamerNa1dag = await kamerContract.kamer.call()
        assert.equal(1, kamerNa1dag.AantalGeboekteDagen, 'Na 1x deur openen moet aantal beschikbare dagen 1 zijn')
        await kamerContract.OpenDeur({ from: accounts[1] })

        const kamerNa2dagen = await kamerContract.kamer.call()
        assert.equal(0, kamerNa2dagen.AantalGeboekteDagen, 'Na 2x deur openen moet aantal beschikbare dagen 0 zijn')
        // volgende moet fout geven
        await kamerContract.OpenDeur({ from: accounts[1] })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Alle geboekte dagen zijn opgebruikt -- Reason given: Alle geboekte dagen zijn opgebruikt.',
          'Verkeerde foutmelding')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(0, kamer.AantalGeboekteDagen, 'Aantal beschikbare dagen moet nog steeds 0 zijn')
      }
    })
    it('Probeer de open deur te openen als niet-boeker', async () => {
      try {
        await kamerContract.MaakBoeking({ value: StandaardPrijs, from: accounts[1] })
        await kamerContract.OpenDeur({ from: accounts[2] })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Enkel de boeker mag deze actie doen -- Reason given: Enkel de boeker mag deze actie doen.',
          'Verkeerde foutmelding')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(1, kamer.AantalGeboekteDagen, 'Aantal beschikbare dagen moet nog steeds 1 zijn')
      }
    })
  })

  describe('Balans', () => {
    it('Contract balans', async () => {
      const balans = await balance.current(kamerContract.address, unit = 'wei')
      const ophalenBalans = await kamerContract.ToonBalans()
      assert.equal(balans.toString(), ophalenBalans.toString(), "Balans niet gelijk")
    })
    it('Eigenaar kan balans uitbetalen', async () => {
      const trackerContract = await balance.tracker(kamerContract.address, unit = 'wei')
      const trackerEigenaar = await balance.tracker(accounts[0], unit = 'wei')

      await kamerContract.Uitbetaling()
      const nieuwContractBalans = await trackerContract.get()
      assert.equal(0, nieuwContractBalans, 'Contract balans is nu niet null')

      const deltaContract = trackerContract.delta()
      const deltaEigenaar = trackerEigenaar.delta()
      assert.equal(deltaContract.toString(), deltaEigenaar.toString(), 'Niet volledige balans is overgezet naar eigenaar')
    })
    it('Niet-eigenaar kan geen uitbetaling doen', async () => {
      const trackerContract = await balance.tracker(kamerContract.address, unit = 'wei')
      try {
        await kamerContract.Uitbetaling({ from: accounts[2] })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const contractDelta = await trackerContract.delta()
        assert.equal('0', contractDelta.toString(), 'Contract balans mag niet veranderd zijn want de uitbetaling mocht niet doorgaan')
      }
    })
  })
})
