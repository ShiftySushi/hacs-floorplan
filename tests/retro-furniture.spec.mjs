import {test,expect} from '@playwright/test';
test('furniture changes design with each custom style without changing placement',async({page})=>{
  await page.goto('/demo/');
  const card=page.locator('floorplan-card');
  const placements=()=>card.locator('[data-object-id]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.objectId,n.getAttribute('transform')]));
  const before=await placements();
  await card.getByRole('combobox',{name:'Custom style',exact:true}).selectOption('pokemon');
  const art=card.locator('[data-retro-furniture="pokemon"]');await expect(art.first()).toBeVisible();
  const handheld=await art.first().innerHTML();expect(await placements()).toEqual(before);
  await card.getByRole('combobox',{name:'Custom style',exact:true}).selectOption('zelda');
  const adventure=card.locator('[data-retro-furniture="zelda"]');await expect(adventure.first()).toBeVisible();
  expect(await adventure.first().innerHTML()).not.toEqual(handheld);expect(await placements()).toEqual(before);
  await card.getByRole('button',{name:'2D',exact:true}).click();
  await expect(card.locator('[data-retro-furniture]')).toHaveCount(0);
});
