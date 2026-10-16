<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ArrowLeftRight, ArrowRight, ArrowUp, ArrowDown, Upload, Copy, Check, RotateCcw, FileText, Moon, Download, X, Sun, Columns2, AlignLeft } from 'lucide-vue-next'
import { compareTexts } from './diff'
const left=ref(''), right=ref(''), compared=ref(false), spaces=ref(true), ignoreCase=ref(false), onlyChanges=ref(false), unified=ref(false), notice=ref(''), busy=ref(false)
const theme=ref('dark')
try { theme.value=localStorage.getItem('sunne-diff-theme')==='light'?'light':'dark' } catch {}
watch(theme, value=>{
 document.documentElement.dataset.theme=value
 try { localStorage.setItem('sunne-diff-theme',value) } catch {}
},{immediate:true})
const rows=ref([])
const activeDiff=ref(-1)
const diffContainer=ref(null)
const activeRow=computed(()=>changed.value[activeDiff.value])
async function focusDifference(){
 await nextTick()
 // On the first comparison the results panel is newly mounted. Wait for its
 // layout before scrolling both the result viewport and the page.
 await new Promise(resolve=>requestAnimationFrame(resolve))
 const container=diffContainer.value
 const row=container?.querySelector('[data-active="true"]')
 if(!row) return
 const rowBounds=row.getBoundingClientRect()
 const containerBounds=container.getBoundingClientRect()
 container.scrollTo({
  top:container.scrollTop+rowBounds.top-containerBounds.top-container.clientTop-(container.clientHeight-rowBounds.height)/2,
  behavior:'instant'
 })
 row.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})
 row.focus({preventScroll:true})
}
function navigateDifference(direction){
 const total=changed.value.length
 if(!total) return
 activeDiff.value=(activeDiff.value+direction+total)%total
 focusDifference()
}
watch([onlyChanges,unified],()=>{if(compared.value&&activeDiff.value>=0) focusDifference()})
const changed=computed(()=>rows.value.filter(x=>x.type==='change'))
const added=computed(()=>changed.value.filter(x=>x.rn!==null).length)
const removed=computed(()=>changed.value.filter(x=>x.ln!==null).length)
const visible=computed(()=>onlyChanges.value?changed.value:rows.value)
const stale=ref(false)
watch([left,right],()=>{if(compared.value) stale.value=true})
watch([spaces,ignoreCase],()=>{if(compared.value) compare()},{flush:'sync'})
function compare(){busy.value=true;setTimeout(()=>{try{rows.value=compareTexts(left.value,right.value,{spaces:spaces.value,case:ignoreCase.value});compared.value=true;stale.value=false;activeDiff.value=changed.value.length?0:-1;focusDifference()}catch{notice.value='Não foi possível comparar estes textos. Tente um arquivo menor.'}finally{busy.value=false}},20)}
function reset(){left.value='';right.value='';compared.value=false;activeDiff.value=-1;notice.value=''}
function swap(){[left.value,right.value]=[right.value,left.value];if(compared.value)compare()}
async function load(event,side){const file=event.target.files?.[0] || event.dataTransfer?.files?.[0];if(!file)return;if(file.size>2*1024*1024){notice.value='Escolha um arquivo de texto de até 2 MB.';return}try{const text=await file.text();if(text.includes('\0'))throw Error();(side==='left'?left:right).value=text;notice.value=''}catch{notice.value='Este arquivo não parece ser um arquivo de texto.'}if(event.target.value)event.target.value=''}
async function copy(text){try{await navigator.clipboard.writeText(text);notice.value='Texto copiado.'}catch{notice.value='Não foi possível copiar. Selecione o texto e copie manualmente.'}}
function download(){const text=rows.value.flatMap(row=>row.type==='equal'?['  '+row.left]:[...(row.left!==undefined?['- '+row.left]:[]),...(row.right!==undefined?['+ '+row.right]:[])]).join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='comparacao.txt';a.click();URL.revokeObjectURL(url)}
const count=t=>t? t.split('\n').length:0
</script>

<template>
 <div class="app-shell">
  <header class="header"><a class="brand" href="./" aria-label="Sunne Diff início"><span class="brand-icon"><img src="/brand-icon.png" alt="" width="36" height="36"></span>sunne<span class="brand-light">diff</span></a><div class="header-controls"><button class="theme-toggle" type="button" role="switch" :aria-checked="theme==='dark'" aria-label="Modo escuro" :title="theme==='dark'?'Ativar modo claro':'Ativar modo escuro'" @click="theme=theme==='dark'?'light':'dark'"><Sun v-if="theme==='dark'" :size="18"/><Moon v-else :size="18"/></button></div></header>
  <main @keydown.ctrl.enter.prevent="(!busy && (left || right)) && compare()" @keydown.meta.enter.prevent="(!busy && (left || right)) && compare()">
   <section class="workspace" aria-label="Comparador de textos">
    <div class="workspace-top"><div class="section-title"><FileText :size="18"/> Comparar textos</div><div class="top-actions"><button @click="reset"><RotateCcw :size="14"/> Limpar</button></div></div>
    <div class="editors">
     <div v-for="side in ['left','right']" :key="side" class="editor-panel" @dragover.prevent @drop.prevent="load($event,side)">
      <div class="editor-heading"><div><span :class="['version-dot',side]"></span><strong>{{side==='left'?'Texto original':'Texto modificado'}}</strong><span class="version-label">{{side==='left'?'ANTES':'DEPOIS'}}</span></div><div class="editor-actions"><label class="icon-button" :for="'file-'+side" title="Importar arquivo"><Upload :size="16"/><span class="sr-only">Importar {{side==='left'?'original':'modificado'}}</span></label><input :id="'file-'+side" type="file" class="sr-only" accept="text/*,.json,.csv,.md,.js,.ts,.vue,.xml,.yaml,.yml,.log" @change="load($event,side)"><button :aria-label="'Copiar texto '+side" title="Copiar texto" @click="copy(side==='left'?left:right)"><Copy :size="15"/></button></div></div>
      <div class="textarea-wrap"><span class="gutter">1</span><textarea v-if="side==='left'" v-model="left" spellcheck="false" aria-label="Texto original" placeholder="Cole seu texto original aqui..."></textarea><textarea v-else v-model="right" spellcheck="false" aria-label="Texto modificado" placeholder="Cole a nova versão aqui..."></textarea></div>
      <div class="editor-footer"><span>Texto simples</span><span>{{count(side==='left'?left:right)}} linhas <b>·</b> {{(side==='left'?left:right).length.toLocaleString('pt-BR')}} caracteres</span></div>
     </div><button class="swap" aria-label="Inverter textos" title="Inverter textos" @click="swap"><ArrowLeftRight :size="17"/></button>
    </div>
    <div class="compare-toolbar"><div class="options"><label><input v-model="spaces" type="checkbox"> Ignorar espaços</label><label><input v-model="ignoreCase" type="checkbox"> Ignorar maiúsculas e minúsculas</label></div><button class="primary" :disabled="busy||(!left&&!right)" @click="compare">{{busy?'Comparando…':'Comparar textos'}} <ArrowRight :size="17"/><kbd>Ctrl ↵</kbd></button></div>
   </section>
   <div v-if="notice" class="notice" role="status">{{notice}}<button aria-label="Fechar aviso" @click="notice='' "><X :size="15"/></button></div>
   <section v-if="compared" class="results" aria-label="Resultado da comparação"><div class="results-heading"><div><h2>Resultado da comparação</h2><p v-if="stale" class="stale">Os textos mudaram. Compare novamente para atualizar.</p><p v-else-if="!changed.length"><Check :size="15"/> Os textos são iguais com as opções selecionadas.</p><p v-else><span class="removed">− {{removed}} removidas</span><span class="added">+ {{added}} adicionadas</span><span>em {{changed.length}} {{changed.length===1?'linha':'linhas'}}</span></p></div><div class="result-actions"><div class="diff-navigation" role="group" aria-label="Navegar entre diferenças"><span class="diff-position" role="status" aria-live="polite">{{activeDiff>=0?activeDiff+1:0}} / {{changed.length}}</span><button aria-label="Diferença anterior" title="Diferença anterior" :disabled="busy||!changed.length" @click="navigateDifference(-1)"><ArrowUp :size="17"/></button><button aria-label="Próxima diferença" title="Próxima diferença" :disabled="busy||!changed.length" @click="navigateDifference(1)"><ArrowDown :size="17"/></button></div><label><input v-model="onlyChanges" type="checkbox"> Só diferenças</label><button :class="{selected:!unified}" aria-label="Vista lado a lado" @click="unified=false"><Columns2 :size="17"/></button><button :class="{selected:unified}" aria-label="Vista unificada" @click="unified=true"><AlignLeft :size="17"/></button><button title="Baixar comparação" aria-label="Baixar comparação" @click="download"><Download :size="17"/></button></div></div>
    <div class="diff-scroll" ref="diffContainer"><div v-for="(row,index) in visible" :key="index" :class="['diff-row',{unified,'active-diff':row===activeRow}]" :data-active="row===activeRow" tabindex="-1" :aria-label="row.type==='change'?'Diferença na linha '+(row.ln??row.rn):undefined">
      <template v-for="side in ['left','right']" :key="side"><div v-if="!unified||row.type!=='equal'||side==='left'" :class="['diff-cell',row.type==='change'?(row[side]!==undefined?(side==='left'?'deletion':'insertion'):'missing'):'']"><span class="line-number">{{side==='left'?row.ln:row.rn}}</span><span class="sign">{{row.type==='change'&&row[side]!==undefined?(side==='left'?'−':'+'):''}}</span><code v-if="row[side==='left'?'lp':'rp']"><span v-for="(part,i) in row[side==='left'?'lp':'rp']" :key="i" :class="{highlight:part.added||part.removed}">{{part.value}}</span></code><code v-else>{{row[side]??' '}}</code></div></template>
    </div></div>
   </section>
   <div v-else class="empty-result"><span class="empty-icon"><Columns2 :size="23"/></span><div><h2>Compare o texto acima</h2></div></div>
  </main>
  <footer class="minimal-footer"><span>sunne technologies</span></footer>
 </div>
</template>













