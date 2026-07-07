// Faith-forward financial and household encouragement quotes
// Used throughout the HerPurposefulLife Household Manager

export const QUOTES = [
  // Partnership & marriage
  { text: "Two are better than one, because they have a good return for their labor.", source: "Ecclesiastes 4:9" },
  { text: "A successful marriage requires falling in love many times, always with the same person.", source: "Mignon McLaughlin" },
  { text: "Carry each other's burdens, and in this way you will fulfill the law of Christ.", source: "Galatians 6:2" },
  { text: "Love is patient, love is kind. It does not insist on its own way.", source: "1 Corinthians 13:4-5" },
  { text: "It's not about who's right. It's about what's right, together.", source: "Unknown" },
  { text: "A good marriage is the union of two good forgivers.", source: "Ruth Bell Graham" },
  { text: "The best thing to hold onto in life is each other.", source: "Audrey Hepburn" },
  { text: "Above all, love each other deeply, because love covers over a multitude of sins.", source: "1 Peter 4:8" },
  { text: "Coming together is a beginning. Keeping together is progress. Working together is success.", source: "Henry Ford" },
  { text: "And let us consider how we may spur one another on toward love and good deeds.", source: "Hebrews 10:24" },

  // Finance & stewardship
  { text: "The Lord will open the heavens, the storehouse of His bounty, to send rain on your land in season and to bless all the work of your hands.", source: "Deuteronomy 28:12" },
  { text: "Every penny you steward wisely is a seed for your family's future.", source: "HerPurposefulLife" },
  { text: "Honor the Lord with your wealth, with the firstfruits of all your crops.", source: "Proverbs 3:9" },
  { text: "A good person leaves an inheritance for their children's children.", source: "Proverbs 13:22" },
  { text: "For I know the plans I have for you — plans to prosper you and not to harm you.", source: "Jeremiah 29:11" },
  { text: "She is clothed with strength and dignity; she can laugh at the days to come.", source: "Proverbs 31:25" },
  { text: "Budgeting isn't about limiting yourself — it's about making room for what matters most.", source: "HerPurposefulLife" },
  { text: "Wealth gained hastily will dwindle, but whoever gathers little by little will increase it.", source: "Proverbs 13:11" },
  { text: "She watches over the affairs of her household and does not eat the bread of idleness.", source: "Proverbs 31:27" },
  { text: "Every act of faithful stewardship is an act of worship.", source: "HerPurposefulLife" },
  { text: "Managing money well is one of the most powerful ways to love your family.", source: "HerPurposefulLife" },
  { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", source: "Proverbs 21:5" },

  // Motherhood & home
  { text: "She opens her arms to the poor and extends her hands to the needy.", source: "Proverbs 31:20" },
  { text: "Her children arise and call her blessed; her husband also, and he praises her.", source: "Proverbs 31:28" },
  { text: "A home built on love and purpose is the greatest gift you can give your children.", source: "HerPurposefulLife" },
  { text: "Start children off on the way they should go, and even when they are old they will not turn from it.", source: "Proverbs 22:6" },

  // Goals & perseverance
  { text: "Commit to the Lord whatever you do, and He will establish your plans.", source: "Proverbs 16:3" },
  { text: "I can do all this through Him who gives me strength.", source: "Philippians 4:13" },
  { text: "She considers a field and buys it; out of her earnings she plants a vineyard.", source: "Proverbs 31:16" },
  { text: "Your savings goal today is your family's freedom tomorrow.", source: "HerPurposefulLife" },
  { text: "Do not despise these small beginnings, for the Lord rejoices to see the work begin.", source: "Zechariah 4:10" },
];

export const SECTION_ENCOURAGEMENT = {
  budget: {
    verse: "She watches over the affairs of her household and does not eat the bread of idleness.",
    reference: "Proverbs 31:27",
    note: "Every number you enter here is an act of faithful stewardship.",
  },
  meals: {
    verse: "She is like the merchant ships, bringing her food from afar.",
    reference: "Proverbs 31:14",
    note: "Planning your meals is planning for your family's nourishment — body and soul.",
  },
  kids: {
    verse: "A good person leaves an inheritance for their children's children.",
    reference: "Proverbs 13:22",
    note: "Every ringgit spent on your children is an investment in the next generation.",
  },
  bills: {
    verse: "The plans of the diligent lead to profit as surely as haste leads to poverty.",
    reference: "Proverbs 21:5",
    note: "Knowing your bills is the first step to mastering them.",
  },
  goals: {
    verse: "Commit to the Lord whatever you do, and He will establish your plans.",
    reference: "Proverbs 16:3",
    note: "Your savings goals are prayers in action — you are trusting and preparing at the same time.",
  },
  load: {
    verse: "Two are better than one, because they have a good return for their labor.",
    reference: "Ecclesiastes 4:9",
    note: "Seeing the load clearly is the first step to sharing it fairly.",
  },
  dashboard: {
    verse: "For I know the plans I have for you — plans to prosper you and not to harm you.",
    reference: "Jeremiah 29:11",
    note: "You are doing something powerful today — showing up for your household with intention.",
  },
  profile: {
    verse: "She is clothed with strength and dignity; she can laugh at the days to come.",
    reference: "Proverbs 31:25",
    note: "You are building something beautiful — one purposeful day at a time.",
  },
};

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

export function getSectionEncouragement(section) {
  return SECTION_ENCOURAGEMENT[section] || SECTION_ENCOURAGEMENT.dashboard;
}
