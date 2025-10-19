/* ---------------- DOM ---------------- */
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const recipeList = document.getElementById('recipeList');
const loading = document.getElementById('loading');
const recipeModal = document.getElementById('recipeModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const favoritesBtn = document.getElementById('favoritesBtn');
const themeToggle = document.getElementById('themeToggle');
const suggestions = document.getElementById('suggestions');
const filterBtns = document.querySelectorAll('.filter-btn');
const randomBtn = document.getElementById('randomBtn');
const recipeOfDay = document.getElementById('recipeOfDay');
const hamburger = document.getElementById('hamburger');

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let lastResults = [];
let currentView = 'search'; // 'search' | 'favorites' | 'category'

/* --------------- Helpers --------------- */
function showLoading(){ loading.classList.remove('hidden'); }
function hideLoading(){ loading.classList.add('hidden'); }
function saveFavorites(){ localStorage.setItem('favorites', JSON.stringify(favorites)); }
function escapeHtml(str=''){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

/* render recipes */
function renderRecipes(meals){
  lastResults = meals || [];
  recipeList.innerHTML = meals.map(meal => {
    const isFav = favorites.some(f => f.id === meal.idMeal);
    return `
      <div class="recipe-card" data-id="${meal.idMeal}">
        <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
        <div class="card-body">
          <h3>${escapeHtml(meal.strMeal)}</h3>
          <div class="card-actions">
            <button class="btn view-btn" data-id="${meal.idMeal}">View</button>
            <button class="btn fav-btn ${isFav ? 'active' : ''}" data-id="${meal.idMeal}">${isFav ? 'Saved ❤️' : 'Save 🤍'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* render favorites */
function renderFavorites(){
  currentView = 'favorites';
  if (!favorites.length) {
    recipeList.innerHTML = `<p style="padding:18px; text-align:center;">No favorites yet — save recipes to see them here.</p>`;
    return;
  }
  recipeList.innerHTML = favorites.map(f => `
    <div class="recipe-card" data-id="${f.id}">
      <img src="${f.img}" alt="${escapeHtml(f.name)}">
      <div class="card-body">
        <h3>${escapeHtml(f.name)}</h3>
        <div class="card-actions">
          <button class="btn view-btn" data-id="${f.id}">View</button>
          <button class="btn fav-btn active" data-id="${f.id}">Remove 💔</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* --------------- API Calls --------------- */
async function fetchMealsBySearch(query){
  try{
    showLoading();
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    hideLoading();
    return data.meals || [];
  } catch(err){ hideLoading(); console.error(err); return []; }
}

async function fetchMealsByCategory(category){
  try{
    showLoading();
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    hideLoading();
    return data.meals || [];
  } catch(err){ hideLoading(); console.error(err); return []; }
}

async function fetchMealById(id){
  try{
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    const data = await res.json();
    return (data.meals && data.meals[0]) || null;
  } catch(err){ console.error(err); return null; }
}

async function fetchRandomMeal(){
  try{
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/random.php`);
    const data = await res.json();
    return (data.meals && data.meals[0]) || null;
  } catch(err){ console.error(err); return null; }
}

/* --------------- UI Actions --------------- */
async function handleSearch(){
  const q = searchInput.value.trim();
  if (!q) return;
  currentView = 'search';
  suggestions.innerHTML = '';
  const meals = await fetchMealsBySearch(q);
  if (!meals.length) {
    recipeList.innerHTML = `<p style="padding:18px; text-align:center;">No recipes found for “${escapeHtml(q)}”</p>`;
    lastResults = [];
    return;
  }
  renderRecipes(meals);
}

/* filter category */
async function handleFilterCategory(category){
  currentView = 'category';
  const meals = await fetchMealsByCategory(category);
  if (!meals.length) {
    recipeList.innerHTML = `<p style="padding:18px; text-align:center;">No recipes found for category ${escapeHtml(category)}</p>`;
    lastResults = [];
    return;
  }
  renderRecipes(meals);
}

/* show details modal */
async function showDetails(id){
  const meal = await fetchMealById(id);
  if (!meal) return alert('Could not load recipe details.');
  // ingredients
  let ingredientsHTML = '';
  for (let i=1;i<=20;i++){
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredientsHTML += `<li>${escapeHtml(ing)} — <b>${escapeHtml(measure||'')}</b></li>`;
    }
  }

  modalBody.innerHTML = `
    <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
    <h2>${escapeHtml(meal.strMeal)}</h2>
    <p><strong>Category:</strong> ${escapeHtml(meal.strCategory)} • <strong>Area:</strong> ${escapeHtml(meal.strArea)}</p>
    <h3>🧾 Ingredients</h3>
    <ul class="ingredients">${ingredientsHTML}</ul>
    <h3>🍳 Instructions</h3>
    <p style="white-space:pre-wrap;">${escapeHtml(meal.strInstructions)}</p>
    ${meal.strYoutube ? `<p><a href="${meal.strYoutube}" target="_blank" rel="noopener">📺 Watch on YouTube</a></p>` : ''}
  `;

  // show modal, lock background, and scroll modal into view
  recipeModal.classList.remove('hidden');
  recipeModal.setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');

  // ensure modal visible: scroll it into view smoothly
  // scroll top first (so modal appears at top of viewport)
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // then focus modal content after a tiny delay to ensure it is visible
  setTimeout(() => {
    const content = recipeModal.querySelector('.modal-content');
    if (content) {
      content.focus?.();
      content.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 200);
}

/* toggle favorite */
async function toggleFavoriteById(id){
  const idx = favorites.findIndex(f => f.id === id);
  if (idx !== -1) {
    favorites.splice(idx,1);
    saveFavorites();
    if (currentView === 'favorites') renderFavorites(); else renderRecipes(lastResults);
    return;
  }

  // try find in lastResults
  let found = (lastResults || []).find(m => m.idMeal === id);
  if (found) {
    favorites.push({ id: found.idMeal, name: found.strMeal, img: found.strMealThumb });
    saveFavorites();
    if (currentView === 'favorites') renderFavorites(); else renderRecipes(lastResults);
    return;
  }
  // else fetch
  const meal = await fetchMealById(id);
  if (meal) {
    favorites.push({ id: meal.idMeal, name: meal.strMeal, img: meal.strMealThumb });
    saveFavorites();
    if (currentView === 'favorites') renderFavorites(); else renderRecipes(lastResults);
  }
}

/* suggestions (debounced) */
let suggestionTimer = null;
function showSuggestionsDebounced(q){
  if (!q || q.length < 2) { suggestions.innerHTML = ''; return; }
  if (suggestionTimer) clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(async () => {
    const meals = await fetchMealsBySearch(q);
    suggestions.innerHTML = '';
    if (!meals || !meals.length) return;
    meals.slice(0,6).forEach(m => {
      const div = document.createElement('div');
      div.textContent = m.strMeal;
      div.className = 'suggestion-item';
      div.addEventListener('click', () => {
        searchInput.value = m.strMeal;
        suggestions.innerHTML = '';
        handleSearch();
      });
      suggestions.appendChild(div);
    });
  }, 220);
}

/* load recipe of the day */
async function loadRecipeOfTheDay(){
  const meal = await fetchRandomMeal();
  if (!meal) return;
  recipeOfDay.innerHTML = `
    <div class="r-left">
      <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
    </div>
    <div class="r-right">
      <h2>Recipe of the Day: ${escapeHtml(meal.strMeal)}</h2>
      <p>${escapeHtml(meal.strInstructions ? meal.strInstructions.substring(0, 150) + '...' : '')}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn view-btn" data-id="${meal.idMeal}">View Recipe</button>
        <button class="btn fav-btn ${favorites.some(f=>f.id===meal.idMeal) ? 'active':''}" data-id="${meal.idMeal}">${favorites.some(f=>f.id===meal.idMeal) ? 'Saved ❤️':'Save 🤍'}</button>
      </div>
    </div>
  `;
}

/* --------------- Events --------------- */
/* search */
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') handleSearch();
  else showSuggestionsDebounced(e.target.value);
});

/* category filters */
filterBtns.forEach(btn => btn.addEventListener('click', () => handleFilterCategory(btn.dataset.category)));

/* random */
randomBtn.addEventListener('click', async () => {
  const meal = await fetchRandomMeal();
  if (meal) showDetails(meal.idMeal);
});

/* favorites view */
favoritesBtn.addEventListener('click', () => renderFavorites());

/* theme toggle (dark mode) */
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const pressed = document.body.classList.contains('dark');
  themeToggle.setAttribute('aria-pressed', String(pressed));
});

/* modal close */
closeModal.addEventListener('click', () => {
  recipeModal.classList.add('hidden');
  recipeModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
});
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) {
    recipeModal.classList.add('hidden');
    recipeModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
  }
});

/* keyboard escape to close modal */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!recipeModal.classList.contains('hidden')) {
      recipeModal.classList.add('hidden');
      recipeModal.setAttribute('aria-hidden','true');
      document.body.classList.remove('no-scroll');
    }
    // also close nav if open
    if (document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded','false');
    }
  }
});

/* delegated clicks for view & fav buttons (works on recipeList & recipeOfDay) */
document.addEventListener('click', (e) => {
  if (e.target.matches('.view-btn')) {
    const id = e.target.dataset.id;
    if (id) showDetails(id);
    // also collapse mobile nav if open
    if (document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded','false');
    }
    return;
  }
  if (e.target.matches('.fav-btn')) {
    const id = e.target.dataset.id;
    if (id) toggleFavoriteById(id);
    return;
  }
});

/* hamburger toggle */
hamburger.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  hamburger.setAttribute('aria-expanded', String(open));
});

/* close nav when clicking a link */
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    if (document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded','false');
    }
  });
});

/* --------------- Init on load --------------- */
window.addEventListener('load', async () => {
  await loadRecipeOfTheDay();
  const initial = await fetchMealsBySearch('chicken');
  if (initial.length) renderRecipes(initial.slice(0,12));
});
