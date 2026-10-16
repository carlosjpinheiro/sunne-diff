import test from 'node:test'
import assert from 'node:assert/strict'
import { compareTexts } from './src/diff.js'
test('aligns inserted lines without marking following lines changed',()=>{const rows=compareTexts('a\nb','a\nnew\nb');assert.equal(rows[1].left,undefined);assert.equal(rows[1].right,'new');assert.equal(rows[2].type,'equal');assert.equal(rows[2].ln,2);assert.equal(rows[2].rn,3)})
test('highlights changed words and keeps text safe as plain values',()=>{const row=compareTexts('Olá mundo','Olá <script>')[0];assert.ok(row.lp.some(p=>p.removed));assert.equal(row.rp.map(p=>p.value).join(''),'Olá <script>')})
test('handles empty input, CRLF and comparison options',()=>{assert.deepEqual(compareTexts('',''),[]);assert.equal(compareTexts('a\r\nb','a\nb').filter(x=>x.type==='change').length,0);assert.equal(compareTexts(' Olá  Mundo ','olá mundo',{spaces:true,case:true})[0].type,'equal');assert.equal(compareTexts('a','')[0].rn,null)})

test('ignoring spaces removes all spacing differences while preserving displayed text', () => {
 const left = '  a b\t c  ', right = 'abc'
 const row = compareTexts(left, right, { spaces: true })[0]
 assert.equal(row.type, 'equal')
 assert.equal(row.left, left)
 assert.equal(row.right, right)
 assert.equal(compareTexts(left, right)[0].type, 'change')
})

test('ignored spaces stay unhighlighted in a line with real edits', () => {
 const row = compareTexts('Olá   mundo', 'Olá\t planeta', { spaces: true })[0]
 assert.equal(row.type, 'change')
 assert.equal(row.lp.map(p => p.value).join(''), 'Olá   mundo')
 assert.equal(row.rp.map(p => p.value).join(''), 'Olá\t planeta')
 assert.ok(row.lp.some(p => p.removed))
 assert.ok(row.rp.some(p => p.added))
 for (const part of [...row.lp, ...row.rp]) {
  if (part.added || part.removed) assert.ok(!/\s/u.test(part.value))
 }
})

test('ignored case stays unhighlighted alongside a real edit', () => {
 const row = compareTexts('ABC 123', 'abc 124', { case: true })[0]
 assert.equal(row.lp.filter(p => p.removed).map(p => p.value).join(''), '3')
 assert.equal(row.rp.filter(p => p.added).map(p => p.value).join(''), '4')
 assert.equal(compareTexts('ÁRVORE', 'árvore', { case: true })[0].type, 'equal')
})

test('combined options suppress noise and preserve unicode and actual edits', () => {
 const row = compareTexts('  Olá 👋 A1', 'olá👋a2', { spaces: true, case: true })[0]
 assert.equal(row.lp.map(p => p.value).join(''), '  Olá 👋 A1')
 assert.equal(row.rp.map(p => p.value).join(''), 'olá👋a2')
 assert.equal(row.lp.filter(p => p.removed).map(p => p.value).join(''), '1')
 assert.equal(row.rp.filter(p => p.added).map(p => p.value).join(''), '2')
})
