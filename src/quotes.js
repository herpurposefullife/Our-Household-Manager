// Rotating quotes shown throughout the app — mostly general teamwork/partnership quotes,
// with occasional Bible verses mixed in. One is chosen per step per session (stable on revisit
// within the same session, different next time).

export const QUOTES = [
  { text: "Two are better than one, because they have a good return for their labor.", source: "Ecclesiastes 4:9" },
  { text: "Teamwork is the ability to work together toward a common vision.", source: "Andrew Carnegie" },
  { text: "A successful marriage requires falling in love many times, always with the same person.", source: "Mignon McLaughlin" },
  { text: "Carry each other's burdens, and in this way you will fulfill the law of Christ.", source: "Galatians 6:2" },
  { text: "Alone we can do so little; together we can do so much.", source: "Helen Keller" },
  { text: "The strength of a family, like the strength of an army, lies in its loyalty to each other.", source: "Mario Puzo" },
  { text: "Love is patient, love is kind. It does not insist on its own way.", source: "1 Corinthians 13:4-5" },
  { text: "It's not about who's right. It's about what's right, together.", source: "Unknown" },
  { text: "A good marriage is the union of two good forgivers.", source: "Ruth Bell Graham" },
  { text: "Where there is no counsel, the people fall; but in the multitude of counselors there is safety.", source: "Proverbs 11:14" },
  { text: "Coming together is a beginning. Keeping together is progress. Working together is success.", source: "Henry Ford" },
  { text: "Marriage is not just spiritual communion, it is also remembering to take out the trash.", source: "Joyce Brothers" },
  { text: "Bear one another's burdens, and so fulfill the law of Christ.", source: "Galatians 6:2" },
  { text: "The best thing to hold onto in life is each other.", source: "Audrey Hepburn" },
  { text: "Many hands make light work.", source: "John Heywood" },
  { text: "And let us consider how we may spur one another on toward love and good deeds.", source: "Hebrews 10:24" },
  { text: "A team is not a group of people who work together. A team is a group of people who trust each other.", source: "Simon Sinek" },
  { text: "Above all, love each other deeply, because love covers over a multitude of sins.", source: "1 Peter 4:8" },
  { text: "We are stronger when we listen, and smarter when we share.", source: "Rania Al-Abdullah" },
  { text: "Two people can keep a secret, if one of them is dead — but two people can also carry a home, if both of them show up.", source: "Adapted" },
];

// Returns a quote for a given step key, stable for the session via sessionStorage.
export function getSessionQuote(stepKey) {
  const storageKey = `hm_quote_${stepKey}`;
  const stored = sessionStorage.getItem(storageKey);
  if (stored !== null) {
    const idx = parseInt(stored, 10);
    if (!isNaN(idx) && QUOTES[idx]) return QUOTES[idx];
  }
  const idx = Math.floor(Math.random() * QUOTES.length);
  sessionStorage.setItem(storageKey, String(idx));
  return QUOTES[idx];
}
