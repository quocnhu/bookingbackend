/**
 * Which template (parser) handles an incoming email.
 *
 * The default matching is the hard-coded header check (From/Subject) that has
 * always been used, but the operator can override it from the environment:
 *
 *   MAIL_TEMPLATE_PREFIX_RULES='subject:conversation with=advancedViator'
 *
 * Format:  `[field:]prefix=templateTag`, entries separated by commas or
 * newlines.
 *   field  — subject | from | any (default: any)
 *   prefix — matched case-insensitively against the START of the header
 *   tag    — the templateTag the parser registry knows (viator, advancedViator…)
 *
 * The rules are evaluated BEFORE the built-in defaults, so the environment
 * always wins. A rule that names an unknown template is ignored (the built-in
 * matching takes over) — the ingestion logs it.
 */

/** Which header a rule is matched against. */
export type TemplateRuleField = 'subject' | 'from' | 'any';

export interface TemplateRule {
  field: TemplateRuleField;
  /** Lower-cased prefix. */
  prefix: string;
  /** The templateTag (e.g. 'advancedViator'). */
  tag: string;
}

export interface MailHeaders {
  subject?: string | null;
  from?: string | null;
}

/** Parse the env value into rules. Malformed entries are skipped. */
export function parseTemplateRules(raw?: string | null): TemplateRule[] {
  if (!raw) return [];
  const rules: TemplateRule[] = [];

  for (const chunk of raw.split(/[,;\n]+/)) {
    const entry = chunk.trim();
    if (!entry) continue;

    const eq = entry.indexOf('=');
    if (eq === -1) continue;

    const left = entry.slice(0, eq).trim();
    const tag = entry.slice(eq + 1).trim();
    if (!left || !tag) continue;

    let field: TemplateRuleField = 'any';
    let prefix = left;

    const colon = left.indexOf(':');
    if (colon > 0) {
      const maybeField = left.slice(0, colon).trim().toLowerCase();
      if (
        maybeField === 'subject' ||
        maybeField === 'from' ||
        maybeField === 'any'
      ) {
        field = maybeField;
        prefix = left.slice(colon + 1).trim();
      }
    }

    if (!prefix) continue;
    rules.push({ field, prefix: prefix.toLowerCase(), tag });
  }

  return rules;
}

/** "Viator <not-1@expmessaging.tripadvisor.com>" → 'not-1@expmessaging.tripadvisor.com'. */
function addressPart(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1] : from).trim().toLowerCase();
}

/** The first rule that matches the headers wins. */
export function matchTemplateRule(
  rules: TemplateRule[],
  headers: MailHeaders,
): string | undefined {
  const subject = (headers.subject ?? '').trim().toLowerCase();
  const from = (headers.from ?? '').trim().toLowerCase();
  const fromAddress = addressPart(from);

  for (const rule of rules) {
    if (rule.field === 'subject' || rule.field === 'any') {
      if (subject.startsWith(rule.prefix)) return rule.tag;
    }
    if (rule.field === 'from' || rule.field === 'any') {
      // The From header is matched as a whole, on the bare address and on the
      // address domain, so "from:expmessaging.tripadvisor.com" also matches
      // "Viator <not-1@expmessaging.tripadvisor.com>".
      if (from.startsWith(rule.prefix)) return rule.tag;
      if (fromAddress.startsWith(rule.prefix)) return rule.tag;
      if (fromAddress.endsWith(`@${rule.prefix}`)) return rule.tag;
      // A sub-domain sender matches the domain rule too: "from:bokun.io"
      // covers "<anything>@hanatourist.bokun.io" — the same semantics as the
      // MAIL_ALLOWED_SENDERS filter.
      if (fromAddress.endsWith(`.${rule.prefix}`)) return rule.tag;
    }
  }

  return undefined;
}

/**
 * The built-in matching — the From/Subject heuristics that have always been
 * used. Kept as a fallback for the mails no env rule covers.
 */
export function defaultTemplateTag(
  fromRaw?: string | null,
  subjectRaw?: string | null,
): string {
  const from = (fromRaw ?? '').toLowerCase();
  const subject = (subjectRaw ?? '').toLowerCase();
  let tag = 'unknown';

  if (from.includes('airbnb.com')) tag = 'airbnb';
  else if (from.includes('booking.com') || from.includes('@booking.com'))
    tag = 'booking-com';
  else if (
    from.includes('getyourguide.com') ||
    subject.includes('getyourguide')
  )
    tag = 'getyourguide';
  else if (
    from.includes('viator.com') ||
    from.includes('tripadvisor.com') ||
    // Bókun delivers every brand (Viator / GetYourGuide / …) through one
    // mailbox; the actual brand is resolved from the mail body by the parser.
    from.includes('bokun.io') ||
    subject.includes('viator') ||
    subject.includes('tripadvisor')
  )
    tag = 'viator';
  else if (/booking|reservation|confirmation|trip to/i.test(subject))
    tag = 'website';

  return tag;
}

/**
 * True when MAIL_TEMPLATE_PREFIX_RULES route this mail to `tag`.
 *
 * Lets a parser claim a sender that is configured ONLY in the environment
 * (e.g. the test forwarders, or a new OTA added in production) without a
 * hard-coded address in the code.
 */
export function isRoutedToTag(headers: MailHeaders, tag: string): boolean {
  return (
    matchTemplateRule(
      parseTemplateRules(process.env.MAIL_TEMPLATE_PREFIX_RULES),
      headers,
    ) === tag
  );
}

/**
 * The template for a mail: the env rules first, then the built-in defaults.
 */
export function resolveTemplateTag(
  headers: MailHeaders,
  rules: TemplateRule[] = [],
): string {
  return (
    matchTemplateRule(rules, headers) ??
    defaultTemplateTag(headers.from, headers.subject)
  );
}
