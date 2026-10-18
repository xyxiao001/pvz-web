export function plantReward(image: string, name: string, description: string) {
  return `<div class="plant-reward"><div class="plant-reward-art"><img src="${image}" alt="${name}"></div><h3>${name}</h3><p class="plant-reward-description">${description}</p></div>`;
}
