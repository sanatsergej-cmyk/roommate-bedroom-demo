(() => {
  const normalize = value => String(value).toLowerCase().replaceAll('ё', 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();

  const finishAliases = {
    floor: { oak: /дуб.{0,22}елоч|елочк|светл\S* дуб|светл\S* пол/, walnut: /тепл\S* орех|орехов\S* пол/, stone: /травертин/, smoked: /темн\S* (?:доск|пол)/ },
    walls: { sage: /шалфе/, chalk: /молоч\S* стен|стен.*молоч/, lime: /тепл\S* штукатур/ },
    rug: { none: /без ковра|уб(?:ери|рать).*ковер/, jute: /песоч\S* джут/, grey: /сер\S* (?:джут|ковер)/ },
    door: { chalk: /молоч\S* двер|двер.*молоч/, walnut: /темное дерево|темн\S* двер/, oak: /дубов\S* двер|двер.*дуб/ },
    window: { graphite: /графит/, chalk: /светл\S* рам|рам.*светл/, oak: /деревян\S* рам/ },
  };

  const slotAliases = {
    bed: /кроват/, tableLeft: /лев\S* тумб|тумб.*лев|(?:^| )слева(?: |$)/, table: /прав\S* тумб|тумб.*прав|(?:^| )справа(?: |$)/, chair: /кресл/, tv: /телевиз|(?:^| )тв(?: |$)/, lamp: /торшер|светильник/,
  };

  function search(query, products) {
    const parts = normalize(query).split(' ').filter(Boolean);
    if (!parts.length) return [];
    return Object.entries(products).filter(([, product]) => {
      const indexed = normalize(`${product.title} ${product.sku}`);
      return parts.every(part => indexed.includes(part));
    });
  }

  function parse(text, { products, slots, activeSlot }) {
    const items = {};
    const finishes = {};
    let budget;
    let lightOn;
    const unknown = [];
    for (const raw of text.split(/(?:[;\n]|,\s+|\s+и\s+)/i).map(part => part.trim()).filter(Boolean)) {
      const part = normalize(raw);
      const budgetMatch = raw.match(/(?:бюджет\S*\s*(?:до\s+)?|улож\S*\s*(?:в|до)\s+|^до\s+)([\d\s\u202f\u00a0]+(?:[.,]\d+)?)\s*(тыс\S*|к(?=$|\s))?/i);
      if (budgetMatch) {
        const amount = Math.round(Number(budgetMatch[1].replace(/\s/g, '').replace(',', '.')) * (budgetMatch[2] ? 1000 : 1));
        if (amount > 0 && amount <= 10000000) budget = amount;
        else unknown.push(raw);
        continue;
      }
      const toggle = part.match(/(включ|выключ|погас)\S*.*свет|свет.*(включ|выключ|погас)/);
      if (toggle) {
        lightOn = (toggle[1] || toggle[2]) === 'включ';
        continue;
      }
      const target = Object.keys(slotAliases).find(key => slotAliases[key].test(part));
      const removal = /(?:^| )(?:без|убери\S*|убрать|удали\S*)(?: |$)/.test(part);
      if (removal && slots[target]?.ids.includes(null)) {
        items[target] = null;
        continue;
      }
      const exactSku = Object.entries(products).find(([, product]) => part.split(' ').includes(normalize(product.sku)));
      const exactTitle = Object.entries(products).filter(([, product]) => part.includes(normalize(product.title)));
      let item = exactSku || (exactTitle.length === 1 ? exactTitle[0] : undefined);
      if (!item && /лорена|lorena/.test(part)) item = ['lorena'];
      if (!item && /хелен/.test(part)) item = ['helen'];
      if (!item && /кап[р]из/.test(part)) item = ['kapriz'];
      if (!item && target === 'bed' && /токио/.test(part)) item = ['tokio'];
      if (item) {
        const available = Object.keys(slots).filter(key => slots[key].ids.includes(item[0]));
        const key = available.includes(target) ? target : available.includes(activeSlot) ? activeSlot : available[0];
        if (key && (!target || key === target)) items[key] = item[0];
        else unknown.push(raw);
        continue;
      }
      const finish = Object.entries(finishAliases).find(([, options]) => Object.values(options).some(pattern => pattern.test(part)));
      if (finish) {
        finishes[finish[0]] = Object.keys(finish[1]).find(key => finish[1][key].test(part));
        continue;
      }
      unknown.push(raw);
    }
    return { items, finishes, budget, lightOn, unknown };
  }

  function fitBudget(choices, budget, locked, slots, evaluate) {
    const keys = Object.keys(slots);
    const working = { ...choices, budget };
    let best;
    let minimum = Infinity;
    const scoreIsBetter = (left, right) => {
      const difference = left.findIndex((value, index) => value !== right[index]);
      return difference !== -1 && left[difference] < right[difference];
    };

    function visit(index, removed, changed) {
      if (index === keys.length) {
        const selection = evaluate(working);
        if (!selection.fits || selection.unpriced) return;
        minimum = Math.min(minimum, selection.total);
        const score = [removed, changed, selection.total];
        if (selection.total <= budget && (!best || scoreIsBetter(score, best.score))) {
          best = { choices: { ...working }, score };
        }
        return;
      }
      const key = keys[index];
      const current = choices[key];
      const alternatives = locked.has(key) || current === null ? [current] : slots[key].ids;
      for (const id of alternatives) {
        working[key] = id;
        visit(index + 1, removed + Number(id === null && current !== null), changed + Number(id !== current));
      }
    }
    visit(0, 0, 0);
    return { choices: best?.choices, minimum };
  }

  window.RoomMateRevisions = { search, parse, fitBudget };
})();
