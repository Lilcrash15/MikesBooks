// ads.js

const openAds = [
  "/ad 🐗^*^3MIKES' SPORTING GOODS ^7is ^2NOW OFFERING ^5DEER & BOAR MOUNTED TROPHIES! ^7BRING YOUR TROPHIES IN TODAY!!",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^2OPEN ^5AND BUYING YOUR FISH🐟, MEATS🥩, BONE🍖 AND HIDE🦌🐇🐭🐷! ^7STOP BY!",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^2OPEN! ^5JERRY CANS & ARMOR ARE AVAILABLE ^7| ^1LIMIT 2 PER CUSTOMER.^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7is ^2OPEN! ^7COME CHECK OUT OUR NEW ^5PACK SPECIALS!! ^2LOCATED IN HARMONY!",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^2OPEN!! ^1HAC MEMBERSHIPS / TROPHY SALES / HUNTING SUPPLIES.^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^2OPEN!! ^7GRAB AN MSG TAILGATE CHAIR!! ^3LOCATED IN HARMONY.^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7is ^2OPEN. ^1MK2 PISTOL SKINS AVAILABLE! ^5LOCATED IN HARMONY. ^2WOLF ON THE MAP!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7is ^2OPEN. ^1WE BUY TROPHIES!! ^5LOCATED IN HARMONY. ^2WOLF ON THE MAP!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7is ^2OPEN. ^7LOW ON SUPPLIES?^1 LOCATED IN HARMONY. ^2FISHING POLES, SCUBA TANKS, GOLD PANS & HUNTING GEAR!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^4 is ^2OPEN!! ^5FEEL LIKE DOING SOMETHING DIFFERENT?^2WE NOW SELL GOLD PANS. ^7TRY YOUR LUCK AT FINDING THAT GOLD!⛺ ",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^2OPEN! ^1NEW PRICING ON MK2 SKINS! ^2STOP BY THE STORE TODAY!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^2OPEN! ^2RESTOCK YOUR SUPPLIES! ^5LOCATED IN HARMONY!!⛺^*",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^2OPEN! ^7HAC MEMBERS COME PICK UP YOUR MONTHLY PROMO ITEMS!! ^5STOP BY THE STORE TODAY!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is NOW OFFERING MEMBERSHIPS FOR THE HUNTERS' ASSOCIATION COMMUNITY!! ^2STOP BY THE STORE FOR MORE INFO!^*⛺",
  "/ad 🐗 ^*^3 MIKES' SPORTING GOODS ^7 |  NOW OFFERS ^2COOLERS!!^1 $2500 FOR OUR GREEN OR TAN COOLERS!! ^2LOCATED IN HARMONY.🐗",
  "/ad 🐗 ^*^3 MIKES' SPORTING GOODS ^7 |  TIRED OF SHARK ATTACKS? MSG NOW OFFERS ^5SHARK REPELLENT SPRAY!! ^3$500 PER CAN!! ^2LOCATED IN HARMONY.🐗"
];

const closingAds = [
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^8CLOSED ^7STAY SAFE LS!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS ^7IS ^8CLOSING DUE TO STORM.^7 STAY SAFE LOS SANTOS!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^1CLOSING IN 10 MIN!! ^2BRING YOUR TROPHIES BEFORE WE ^1CLOSE UP!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^1CLOSING IN 30 MIN!! ^2RESTOCK ON YOUR EQUIPMENT BEFORE WE ^1CLOSE UP!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^1CLOSING IN 45 MIN!! ^2BRING YOUR TROPHIES BEFORE WE ^1CLOSE UP!!^*⛺",
  "/ad ⛺^*^3 MIKES' SPORTING GOODS^7 is ^1CLOSING SOON!! ^2RESTOCK YOUR SUPPLIES AND COME GET YOUR MK2 SKINS BEFORE WE ^1CLOSE UP!!^*⛺"
];

const statusSelector = document.getElementById('ad-status-selector');
const adListContainer = document.getElementById('ad-list');
const copyStatus = document.getElementById('copy-status');

function renderAdList(mode) {
  const list = mode === 'OPEN' ? openAds : closingAds;
  adListContainer.innerHTML = '';

  list.forEach(ad => {
    const div = document.createElement('div');
    div.className = 'ad-list-item';
    div.textContent = ad;
    div.title = 'Click to copy';
    div.addEventListener('click', () => {
      navigator.clipboard.writeText(ad).then(() => {
        copyStatus.textContent = 'Ad copied to clipboard!';
        copyStatus.style.color = '#2ecc71';
      }).catch(() => {
        copyStatus.textContent = 'Copy failed.';
        copyStatus.style.color = '#e74c3c';
      });
    });
    adListContainer.appendChild(div);
  });

  copyStatus.textContent = '';
}

statusSelector.addEventListener('change', () => {
  renderAdList(statusSelector.value);
});

renderAdList('OPEN');
