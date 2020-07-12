
const { balance } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const KamerContract = artifacts.require('HotelKamer')
const ERR_REQUIRE = 'Error: Returned error: VM Exception while processing transaction:'

contract('HotelKamer', (accounts) => {
  let kamerContract
  before(async () => {
    kamerContract = await KamerContract.deployed()
  })

  describe('Initiële contract waarden', () => {
    it('Nieuwe kamer moet prijs 0.1 Eth zijn', async () => {
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Prijs, web3.utils.toWei('0.1'), 'Prijs van een nieuwe kamer is niet 0.1 Eth')
    })

    it('Nieuwe kamer moet status vrij hebben', async () => {
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Status.toString(), 0, 'Status van een nieuwe kamer is niet vrij')
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
        await kamerContract.ZetPrijs(10)// als contract eigenaar om een zeker start situatie te hebben
        await kamerContract.ZetPrijs(789, { from: accounts[2] })// als niet-eigenaar --> moet foutmelding geven
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Prijs, 10, 'Prijs moet nog 10 zijn')
      }
    })
  })

  describe('Zet status Geboekt', () => {
    it('zet kamer geboekt', async () => {
      await kamerContract.ZetGeboekt()
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Status, 1, 'Status moet nu geboekt (1) zijn ')
    })
    it('Een niet-eigenaar kan kamer niet op geboekt zetten', async () => {
      try {
        await kamerContract.ZetVrij() // als contract eigenaar om een zeker start situatie te hebben
        await kamerContract.ZetGeboekt({ from: accounts[1] }) // als niet-eigenaar --> moet foutmelding geven
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
          'Foutmelding klopt niet');
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Status, 0, 'Status moet nog steeds vrij (0) zijn ')
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
    it('Zet kamer geboekt, daarna zet terug vrij', async () => {
      await kamerContract.ZetGeboekt()
      await kamerContract.ZetVrij()
      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Status, 0, 'Status moet nu vrij (0) zijn ')
    })
  })

  describe('Maak een boeking', () => {
    it('Boek kamer', async () => {
      const boekingBedrag = web3.utils.toWei('0.1', 'ether')
      await kamerContract.ZetPrijs(boekingBedrag)
      await kamerContract.ZetVrij()

      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')

      await kamerContract.MaakBoeking({ value: boekingBedrag, from: accounts[1] })

      const kamer = await kamerContract.kamer.call()
      assert.equal(kamer.Status, 1, 'Status moet nu geboekt (1) zijn ')

      const delta = await tracker.delta()
      assert.equal(boekingBedrag, delta, 'Niet het juiste bedrag ontvangen')
    })
    it('Boek kamer met onvoldoende betaling => kamer blijft vrij, niets ontvangen', async () => {
      const boekingBedrag = web3.utils.toWei('0.1', 'ether')
      await kamerContract.ZetVrij()
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')
      try {
        await kamerContract.MaakBoeking({ value: 2, from: accounts[4] })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert betaling is minder dan de prijs -- Reason given: betaling is minder dan de prijs.', 'Foutmelding niet juist')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Status.toString(), 0, 'Status moet nog vrij (0) zijn ')
        const delta = await tracker.delta()
        assert.equal(0, delta, 'Contract mag niets ontvangen hebben want de transactie is niet doorgegaan')
      }
    })
    it('Bezette kamer boeken kan niet', async () => {
      await kamerContract.ZetPrijs(50)
      await kamerContract.ZetGeboekt()
      const tracker = await balance.tracker(kamerContract.address, unit = 'wei')
      try {
        await kamerContract.MaakBoeking({ value: 50 })
      }
      catch (fout) {
        assert.equal(fout,
          ERR_REQUIRE + ' revert Kamer is niet vrij -- Reason given: Kamer is niet vrij.', 'Foutmelding niet juist')
      }
      finally {
        const kamer = await kamerContract.kamer.call()
        assert.equal(kamer.Status, 1, 'Status moet nu steeds geboekt (1) zijn ')
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
