import {
  airportTransferProduct,
  isAirportTransferMail,
  refineTemplateTag,
} from './airport-transfer.util';

const AIRPORT_MAIL = {
  body: `Booking details
Product name: Private Airport Transfer Service Ho Chi Minh City
Product Option: Transfer to Airport`,
};

const CU_CHI_MAIL = {
  body: `Booking details
Product name: Cu Chi Ben Duoc Tunnels
Product Option: Shared Group Morning Trip 07:30`,
};

describe('airport-transfer.util', () => {
  it('reads the product name and option', () => {
    expect(airportTransferProduct(AIRPORT_MAIL)).toEqual({
      product: 'Private Airport Transfer Service Ho Chi Minh City',
      option: 'Transfer to Airport',
    });
  });

  it('detects an airport transfer product', () => {
    expect(isAirportTransferMail(AIRPORT_MAIL)).toBe(true);
    expect(isAirportTransferMail(CU_CHI_MAIL)).toBe(false);
  });

  it('refines the message-centre tags only for airport transfers', () => {
    expect(refineTemplateTag('advancedViator', AIRPORT_MAIL)).toBe(
      'airportTransfer',
    );
    expect(refineTemplateTag('viator', AIRPORT_MAIL)).toBe('airportTransfer');
    expect(refineTemplateTag('advancedViator', CU_CHI_MAIL)).toBe(
      'advancedViator',
    );
    expect(refineTemplateTag('website', AIRPORT_MAIL)).toBe('website');
  });
});
