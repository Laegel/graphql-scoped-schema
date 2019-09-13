export const flatten = (args) => args.join(',');

export const intersect = (a, b) => {
  let t;
  if (b.length > a.length) (t = b), (b = a), (a = t);
  return a.filter(function(e) {
    return b.indexOf(e) > -1;
  });
};

export const isFunction = (target) => typeof target === 'function';

export const lookForNested = (object, selector, comparator) => {
  const keys = selector.split('.');
  let temp = { ...object };

  for (let i = 0; i < keys.length; ++i) {
    if (!temp[keys[i]]) {
      return false;
    }
    temp = temp[keys[i]];
  }

  return isFunction(comparator) ? comparator(temp) : temp === comparator;
};
