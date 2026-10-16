import { plantAlmanac, zombieAlmanac, type AlmanacEntry } from '../game/almanac';
import './almanac.css';

type Page = 'plants' | 'zombies';
export function openAlmanac(overlay: HTMLElement, close: () => void) {
  const pages = {plants:plantAlmanac(), zombies:zombieAlmanac()};
  let page: Page = 'plants';
  let group = '全部';
  let selected = pages.plants[0].id;
  overlay.classList.add('almanac-overlay');
  overlay.innerHTML = `<section class="almanac-book" aria-label="庭院图鉴">
    <header class="almanac-header"><h2>庭院图鉴</h2><nav aria-label="图鉴分类"><button class="wood-button" data-page="plants" aria-pressed="true">植物图鉴</button><button class="wood-button" data-page="zombies" aria-pressed="false">僵尸图鉴</button></nav><button class="wood-button almanac-close">返回</button></header>
    <div class="almanac-filters" role="group" aria-label="角色分类"></div>
    <div class="almanac-spread"><section class="almanac-catalog" aria-label="角色列表"><div class="almanac-count"></div><div class="almanac-portraits"></div></section><article class="almanac-detail" aria-label="角色详情"></article></div>
  </section>`;
  const root=overlay.querySelector<HTMLElement>('.almanac-book')!;
  const catalog=root.querySelector<HTMLElement>('.almanac-portraits')!;
  const filters=root.querySelector<HTMLElement>('.almanac-filters')!;
  const detail=root.querySelector<HTMLElement>('.almanac-detail')!;
  const image=(entry:AlmanacEntry)=>`${import.meta.env.BASE_URL}assets/runtime/${entry.image}`;
  const visible=()=>pages[page].filter(entry=>group==='全部'||entry.group===group);
  function select(id:string) {
    selected=id;
    for(const button of catalog.querySelectorAll<HTMLButtonElement>('[data-entry]')) button.setAttribute('aria-pressed',String(button.dataset.entry===id));
    const entry=pages[page].find(entry=>entry.id===id)!;
    detail.innerHTML=`<div class="almanac-stage ${page}"><img src="${image(entry)}" alt="${entry.name}"/></div><div class="almanac-description"><span class="almanac-kind">${entry.group} · ${page==='plants'?'植物':'僵尸'}</span><h3>${entry.name}</h3><dl>${entry.stats.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>${entry.description}</p><h4>${entry.noteTitle}</h4><p>${entry.note}</p>${page==='zombies'?'<small>基础生命与装备分开计算；特殊关卡可能调整数值。</small>':''}</div>`;
    detail.scrollTop=0;
  }
  function renderCatalog() {
    const entries=visible();
    root.querySelector('.almanac-count')!.textContent=`${group} · ${entries.length} ${page==='plants'?'种植物':'种僵尸'}`;
    catalog.innerHTML=entries.map(entry=>`<button class="almanac-entry" data-entry="${entry.id}" aria-label="查看${entry.name}" aria-pressed="false"><img loading="lazy" decoding="async" src="${image(entry)}" alt=""/><span>${entry.name}</span></button>`).join('');
    catalog.scrollTop=0;
    for(const button of catalog.querySelectorAll<HTMLButtonElement>('[data-entry]')) button.onclick=()=>select(button.dataset.entry!);
    select(selected);
  }
  function renderPage() {
    for(const button of root.querySelectorAll<HTMLButtonElement>('[data-page]')) button.setAttribute('aria-pressed',String(button.dataset.page===page));
    filters.innerHTML=['全部',...new Set(pages[page].map(entry=>entry.group))].map(name=>`<button class="wood-button" data-group="${name}" aria-pressed="${name===group}">${name}</button>`).join('');
    for(const button of filters.querySelectorAll<HTMLButtonElement>('[data-group]')) button.onclick=()=>{
      group=button.dataset.group!; selected=visible()[0].id;
      for(const filter of filters.querySelectorAll<HTMLButtonElement>('[data-group]')) filter.setAttribute('aria-pressed',String(filter.dataset.group===group));
      renderCatalog();
    };
    renderCatalog();
  }
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-page]')) button.onclick=()=>{page=button.dataset.page as Page;group='全部';selected=pages[page][0].id;renderPage();};
  root.querySelector<HTMLButtonElement>('.almanac-close')!.onclick=()=>{overlay.classList.remove('almanac-overlay');close();};
  renderPage();
}
