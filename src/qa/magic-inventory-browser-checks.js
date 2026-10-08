(async function(){
 const r={suite:'Magic inventory',checks:0,failures:[]},check=(v,m)=>{r.checks++;if(!v)r.failures.push(m);};
 const pre=document.createElement('pre');document.body.append(pre);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171411;color:white';
 try{
  await Promise.all(WORLD_ART_KEYS[1].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>resolve()))));
  startChapter(1);G.scene='play';G.talk=null;G.packWho='macar';G.packFrom='play';const p=player();
  const plain={n:'Plain Battle Axe',cat:'Weapon',k:'weapon',plus:0};giveMagic(plain,true);
  const ring=magItem({n:'Ring of Invisibility',cat:'Ring',k:'invis'});giveMagic(ring,true);equipPackItem(ring,{silent:true});
  G.packSel=ring;activatePackMagicPower();check(p.invis>0,'equipped ring activates invisibility');activatePackMagicPower();check(p.invis===0,'ring toggles off');
  const regen=magItem({n:'Ring of Regeneration',cat:'Ring',k:'regen'});giveMagic(regen,true);equipPackItem(regen,{silent:true});p.hp=p.maxhp-5;applyWornTurnEffects(2);check(p.hp===p.maxhp-3,'regenerates one HP per dungeon turn');unequipPackSlot(wornSlotOf(regen));applyWornTurnEffects(2);check(p.hp===p.maxhp-3,'stowing stops regeneration');
  const wand=magItem({n:'Wand of Magic Missiles',cat:'Rod/Staff/Wand',k:'wand',charges:2});giveMagic(wand,true);equipPackItem(wand,{silent:true});
  const foe=ent({name:'QA foe',team:'foe',x:p.x+.8,y:p.y+.8,hp:200,maxhp:200,ac:10});G.ents=[p,foe];G.packSel=wand;activatePackMagicPower();check(wand.charges===1,'held wand spends exactly one charge');check(foe.hp<200,'wand damages a real foe');wand.charges=0;const hp=foe.hp;activatePackMagicPower();check(foe.hp===hp,'empty wand does not attack');
  const rows=collectPackRows(packOf('macar'),'macar'),magic=rows.filter(row=>InventoryCategories.matches(row,'magic'));
  check(!magic.some(row=>row.it===plain),'plain picked-up axe absent from Magic');check(magic.some(row=>row.it===ring),'ring remains in Magic');check(rows.some(row=>row.it===plain&&isPackEquipable(row)),'plain axe still available in Gear');
  const healing={n:'Healing',k:'heal',d:'2d4+2 HP'};givePotion(healing,true);const healingRow=collectPackRows(packOf('macar'),'macar').find(row=>row.p&&row.p.n===healing.n);
  check(healingRow&&healingRow.list==='healPots','healing flask is an individual potion row');check(InventoryCategories.matches(healingRow,'magic'),'magical healing flask is in Magic');
  const beforeBeer=packOf('macar').ales;usePackRow(healingRow);check(!packOf('macar').healPots.includes(healingRow.p),'chosen healing flask is consumed');check(packOf('macar').ales===beforeBeer,'healing flask does not consume beer');
  for(const table of [DMG_RING,DMG_WAND,DMG_ARMOR,DMG_SWORD,DMG_WEAP,DMG_MISC_A,DMG_MISC_B,DMG_MISC_C,DMG_MISC_D,DMG_MISC_E])for(const it of table)check(InventoryCategories.isMagic(it),'legacy catalogue magic: '+it.n);
  for(let i=0;i<200;i++){const got=rollMagicItem('any');if(got)check(got.kind==='potion'?MagicItemAvailability.potionAvailable(got.potion):MagicItemAvailability.available(got.item),'generated loot has implemented effect');}
  check(rollMagicItem('scroll')===null,'unfinished scroll category produces no new loot');
  for(const width of [1200,390]){VW=width;VH=900;PORT=width<640;UIS=1;G.scene='pack';G.packTab='magic';G.packSel=ring;G.packScroll=0;G.cam={x:p.x,y:p.y};const cv=document.createElement('canvas');cv.width=width;cv.height=900;cv.style='position:static;width:'+width+'px;height:900px';drawPack(cv.getContext('2d'));document.body.append(cv);}
 }catch(e){r.failures.push(e.stack||String(e));}
 pre.textContent=JSON.stringify(r,null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(r)});
})();
