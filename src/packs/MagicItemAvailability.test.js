'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path'),availability=require('./MagicItemAvailability'),categories=require('./InventoryCategories');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
const potions=require('../loot/DmgPotions');
const c={MagicItemAvailability:availability,InventoryCategories:categories,DMG_POTIONS:globalThis.DmgPotions.TABLE,magItem:o=>({...o}),pickRange:(table,roll)=>table.find(it=>(roll??c.d100())>=it.a&&(roll??c.d100())<=it.b),ri:(a,b)=>a,rollPotion:()=>globalThis.DmgPotions.byRoll(79),magicCategory:k=>k};
vm.createContext(c);vm.runInContext(html.slice(html.indexOf('const DMG_SCROLL='),html.indexOf('function magicCategory('))+fn('rollMagicItem'),c);
let count=0;
for(const cat of ['potion','scroll','ring','wand','misc','armor','sword','weapon'])for(let roll=1;roll<=100;roll++){
 c.d100=()=>roll;const got=c.rollMagicItem(cat);
 if(cat==='scroll'){assert.equal(got,null,'unfinished scrolls do not enter new loot');continue;}
 assert(got,'supported category still yields loot');count++;
 if(got.kind==='potion')assert(availability.potionAvailable(got.potion));else assert(availability.available(got.item),got.n+' must have a real implemented effect');
}
for(const name of ['Amulet of the Planes','Ring of Three Wishes','Manual of Golems','Wand of Conjuration','Mace of Disruption','Sword of Life Stealing','Crossbow of Speed'])assert(!availability.available({n:name}),'unfinished or partial effect is excluded: '+name);
console.log(count+' deterministic loot rolls restricted to implemented effects; unsupported categories and partial effects excluded');
