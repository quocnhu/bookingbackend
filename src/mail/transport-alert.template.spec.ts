import {
  MAIL_LOGIN_CONFIRM_NOTE,
  MAIL_LOGIN_DETAIL_NOTE,
  renderTransportAlert,
} from './transport-alert.template';

describe('renderTransportAlert', () => {
  it('adds the italic login note to text and HTML mails', () => {
    const rendered = renderTransportAlert({
      title: 'New tour assignment',
      message: 'Tour details',
      note: MAIL_LOGIN_CONFIRM_NOTE,
      actionLabel: 'Open my trips',
      actionUrl: 'http://localhost:3000/tour-guide/my-trips',
    });

    expect(rendered.text).toContain(`*${MAIL_LOGIN_CONFIRM_NOTE}*`);
    expect(rendered.html).toContain('font-style:italic');
    expect(rendered.html).toContain(MAIL_LOGIN_CONFIRM_NOTE);
  });

  it('omits the note when none is supplied', () => {
    const rendered = renderTransportAlert({
      title: 'Transport request update',
      message: 'Route details',
    });

    expect(rendered.text).not.toContain(MAIL_LOGIN_DETAIL_NOTE);
    expect(rendered.html).not.toContain('font-style:italic');
  });
});
