import {
  defaultTemplateTag,
  matchTemplateRule,
  parseTemplateRules,
  resolveTemplateTag,
} from './template.util';

describe('parseTemplateRules', () => {
  it('parses a single rule', () => {
    expect(parseTemplateRules('conversation with=advancedViator')).toEqual([
      { field: 'any', prefix: 'conversation with', tag: 'advancedViator' },
    ]);
  });

  it('parses the optional field and several rules', () => {
    const rules = parseTemplateRules(
      'subject:conversation with=advancedViator,from:expmessaging.tripadvisor.com=advancedViator,viator=viator',
    );
    expect(rules).toEqual([
      {
        field: 'subject',
        prefix: 'conversation with',
        tag: 'advancedViator',
      },
      {
        field: 'from',
        prefix: 'expmessaging.tripadvisor.com',
        tag: 'advancedViator',
      },
      { field: 'any', prefix: 'viator', tag: 'viator' },
    ]);
  });

  it('skips malformed entries and lower-cases the prefix', () => {
    expect(
      parseTemplateRules('no-equals-sign, =novalue, subject:Hi=viator'),
    ).toEqual([{ field: 'subject', prefix: 'hi', tag: 'viator' }]);
  });

  it('returns no rules for an empty value', () => {
    expect(parseTemplateRules('')).toEqual([]);
    expect(parseTemplateRules(undefined)).toEqual([]);
  });
});

describe('matchTemplateRule', () => {
  const rules = parseTemplateRules(
    'subject:conversation with=advancedViator,from:expmessaging.tripadvisor.com=advancedViator',
  );

  it('matches the subject prefix (case-insensitive)', () => {
    expect(
      matchTemplateRule(rules, {
        subject: 'Conversation with Pablo M about Viator booking BR-1457720525',
        from: 'Viator <not-1@expmessaging.tripadvisor.com>',
      }),
    ).toBe('advancedViator');
  });

  it('matches every mail of the Viator message centre by its From domain', () => {
    const domainRules = parseTemplateRules(
      'from:expmessaging.tripadvisor.com=advancedViator',
    );
    expect(
      matchTemplateRule(domainRules, {
        subject: 'Your booking BR-1457720525 has been cancelled',
        from: 'Viator <NOT-48586e7a-f4f1-4bff-a0a4-9c4aa776286d@expmessaging.tripadvisor.com>',
      }),
    ).toBe('advancedViator');
  });

  it('matches the dedicated alias of the message centre', () => {
    const aliasRules = parseTemplateRules(
      'from:advancedViator@expmessaging.tripadvisor.com=advancedViator',
    );
    expect(
      matchTemplateRule(aliasRules, {
        subject: 'Conversation with Pablo M about Viator booking BR-1457720525',
        from: 'Viator <advancedViator@expmessaging.tripadvisor.com>',
      }),
    ).toBe('advancedViator');
  });

  it('matches a sub-domain sender with the domain rule', () => {
    const bokunRules = parseTemplateRules('from:bokun.io=viator');
    expect(
      matchTemplateRule(bokunRules, {
        subject: "New booking: Sat 19.Sep '26 @ 12:00 (Hana-T146398840)",
        from: '"Bókun" <notifications@hanatourist.bokun.io>',
      }),
    ).toBe('viator');
  });

  it('routes the Bókun mail to the viator template, not to website', () => {
    const rules = parseTemplateRules(
      'from:bokun.io=viator,from:expmessaging.tripadvisor.com=advancedViator',
    );
    expect(
      resolveTemplateTag(
        {
          subject: "New booking: Sat 19.Sep '26 @ 12:00 (Hana-T146398840)",
          from: '"Bókun" <notifications@hanatourist.bokun.io>',
        },
        rules,
      ),
    ).toBe('viator');
  });

  it('does not match a different subject', () => {
    expect(
      matchTemplateRule(rules, {
        subject: 'Your booking is confirmed',
        from: 'Viator <not-1@expmessaging.tripadvisor.com>',
      }),
    ).toBe('advancedViator'); // the from rule matches
  });

  it('returns undefined when nothing matches', () => {
    expect(
      matchTemplateRule(rules, {
        subject: 'Newsletter',
        from: 'someone@example.com',
      }),
    ).toBeUndefined();
  });

  it('keeps the order of the rules', () => {
    const ordered = parseTemplateRules(
      'subject:conversation with=first,subject:conversation=second',
    );
    expect(matchTemplateRule(ordered, { subject: 'Conversation with X' })).toBe(
      'first',
    );
  });
});

describe('defaultTemplateTag', () => {
  it('keeps the built-in sender/subject matching', () => {
    expect(
      defaultTemplateTag('Viator <not-1@expmessaging.tripadvisor.com>', ''),
    ).toBe('viator');
    expect(defaultTemplateTag('Airbnb <x@airbnb.com>', '')).toBe('airbnb');
    expect(defaultTemplateTag('x@booking.com', '')).toBe('booking-com');
    expect(defaultTemplateTag('x@getyourguide.com', '')).toBe('getyourguide');
    // Bókun delivers every brand through one mailbox → the generic parser.
    expect(defaultTemplateTag('x@hanatourist.bokun.io', '')).toBe('viator');
    expect(defaultTemplateTag('someone@example.com', 'Your reservation')).toBe(
      'website',
    );
    expect(defaultTemplateTag('someone@example.com', 'Hello')).toBe('unknown');
  });
});

describe('resolveTemplateTag', () => {
  it('lets the env rule win over the built-in default', () => {
    const rules = parseTemplateRules(
      'subject:conversation with=advancedViator',
    );
    expect(
      resolveTemplateTag(
        {
          subject:
            'Conversation with Pablo M about Viator booking BR-1457720525',
          from: 'Viator <not-1@expmessaging.tripadvisor.com>',
        },
        rules,
      ),
    ).toBe('advancedViator');
  });

  it('falls back to the built-in default when no rule matches', () => {
    const rules = parseTemplateRules(
      'subject:conversation with=advancedViator',
    );
    expect(
      resolveTemplateTag(
        {
          subject: 'Your booking is confirmed',
          from: 'Viator <not-1@expmessaging.tripadvisor.com>',
        },
        rules,
      ),
    ).toBe('viator');
  });
});
