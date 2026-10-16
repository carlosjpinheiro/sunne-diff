import { diffArrays, diffWordsWithSpace } from 'diff'

// Compare normalized content, but always render the user's original characters.
function inlineParts(left, right, options) {
 if (!options.spaces && !options.case) {
  const parts = diffWordsWithSpace(left, right)
  return { lp: parts.filter(p => !p.added), rp: parts.filter(p => !p.removed) }
 }
 const tokenize = text => Array.from(text, (value, index) => ({ value, index }))
 const a = tokenize(left), b = tokenize(right)
 const relevant = tokens => options.spaces ? tokens.filter(t => !/\s/u.test(t.value)) : tokens
 const chunks = diffArrays(relevant(a), relevant(b), {
  comparator: (x, y) => options.case
   ? x.value.toLocaleLowerCase('pt-BR') === y.value.toLocaleLowerCase('pt-BR')
   : x.value === y.value
 })
 const removed = new Set(), added = new Set()
 for (const chunk of chunks) {
  if (chunk.removed) chunk.value.forEach(t => removed.add(t.index))
  if (chunk.added) chunk.value.forEach(t => added.add(t.index))
 }
 const render = (tokens, changed, flag) => {
  const parts = []
  for (const token of tokens) {
   const highlight = changed.has(token.index)
   const last = parts.at(-1)
   if (last && Boolean(last[flag]) === highlight) last.value += token.value
   else parts.push({ value: token.value, ...(highlight ? { [flag]: true } : {}) })
  }
  return parts
 }
 return { lp: render(a, removed, 'removed'), rp: render(b, added, 'added') }
}

export function compareTexts(left, right, options = {}) {
 const normalize = text => {
  let value = text
  if (options.spaces) value = value.replace(/\s+/gu, '')
  if (options.case) value = value.toLocaleLowerCase('pt-BR')
  return value
 }
 const a = left === '' ? [] : left.replace(/\r\n?/g, '\n').split('\n')
 const b = right === '' ? [] : right.replace(/\r\n?/g, '\n').split('\n')
 const chunks = diffArrays(a, b, { comparator: (x, y) => normalize(x) === normalize(y) })
 const rows = []; let l = 0, r = 0
 for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i]
  if (!c.added && !c.removed) {
   for (const line of c.value) rows.push({ left: a[l], right: b[r], ln: ++l, rn: ++r, type: 'equal' })
   continue
  }
  const removed = c.removed ? c.value : []
  const added = c.added ? c.value : chunks[i + 1]?.added ? chunks[++i].value : []
  for (let j = 0; j < Math.max(removed.length, added.length); j++) {
   const lv = removed[j], rv = added[j]
   const parts = lv !== undefined && rv !== undefined ? inlineParts(lv, rv, options) : {}
   rows.push({ left: lv, right: rv, ln: lv !== undefined ? ++l : null, rn: rv !== undefined ? ++r : null, type: 'change', ...parts })
  }
 }
 return rows
}
