const categories = [
  ['املاک','i-home'],['وسایل نقلیه','i-car'],['کالای دیجیتال','i-phone'],['خانه و آشپزخانه','i-home'],['خدمات','i-settings'],['استخدام','i-user'],
  ['وسایل شخصی','i-bookmark'],['سرگرمی و ورزش','i-list'],['اجتماعی','i-chat'],['تجهیزات و صنعتی','i-settings'],['آموزش','i-help'],['همه دسته‌ها','i-search']
];

const posts = [
  {title:'آپارتمان ۹۵ متری نورگیر در مرکز شهر',price:'۶٬۸۰۰٬۰۰۰٬۰۰۰ تومان',meta:'عباس‌آباد، ۱۲ دقیقه پیش',image:'image-flat'},
  {title:'خودرو سدان کم‌کارکرد مدل ۱۴۰۲',price:'۱٬۲۸۰٬۰۰۰٬۰۰۰ تومان',meta:'خانه اصفهان، نیم ساعت پیش',image:'image-dark'},
  {title:'گوشی هوشمند سالم با جعبه و لوازم',price:'۲۸٬۵۰۰٬۰۰۰ تومان',meta:'مرداویج، ۱ ساعت پیش',image:'image-cool'},
  {title:'میز ناهارخوری چوبی شش نفره',price:'۱۲٬۰۰۰٬۰۰۰ تومان',meta:'سپاهان‌شهر، ۲ ساعت پیش',image:'image-warm'},
  {title:'دوچرخه شهری سبک و تمیز',price:'۸٬۷۵۰٬۰۰۰ تومان',meta:'جلفا، امروز',image:'image-green'},
  {title:'لپ‌تاپ سبک مناسب کار و دانشگاه',price:'۳۶٬۰۰۰٬۰۰۰ تومان',meta:'شیخ صدوق، امروز',image:'image-cool'},
  {title:'استخدام کارشناس فروش با آموزش',price:'حقوق توافقی',meta:'چهارباغ، امروز',image:'image-warm'},
  {title:'اجاره دفتر کار مبله و آرام',price:'ودیعه ۳۰۰ میلیون',meta:'هزارجریب، امروز',image:'image-flat'},
  {title:'دوربین عکاسی حرفه‌ای با لنز',price:'۴۹٬۰۰۰٬۰۰۰ تومان',meta:'ملک‌شهر، دیروز',image:'image-dark'}
];

const cities = ['تهران','مشهد','اصفهان','شیراز','کرج','تبریز','اهواز','قم','کرمانشاه','رشت','ارومیه','یزد'];
const routes = new Set(['home','search','post','account','system']);
let lastFocused = null;

const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const categoryMarkup = ([name,id]) => `<a class="category-card" href="#/search" data-category="${name}"><span class="category-icon">${icon(id)}</span><strong>${name}</strong></a>`;
const postMarkup = (post,index) => `<article class="post-card"><div class="post-card-copy"><h3><a href="#/post">${post.title}</a></h3><div class="post-meta"><p class="post-price">${post.price}</p><span>${post.meta}</span></div></div><div class="post-image ${post.image}"><button class="bookmark-mini" aria-label="نشان کردن آگهی" data-bookmark>${icon('i-bookmark')}</button></div></article>`;

document.querySelector('#category-grid').innerHTML = categories.map(categoryMarkup).join('');
document.querySelector('#home-posts').innerHTML = posts.slice(0,6).map(postMarkup).join('');
document.querySelector('#search-posts').innerHTML = posts.map(postMarkup).join('');
document.querySelector('.city-list').innerHTML = cities.map(city => `<button role="option" data-city="${city}">${city}</button>`).join('');
document.querySelector('#my-posts').innerHTML = posts.slice(0,2).map(post => `<article class="my-post"><div class="post-image ${post.image}"></div><div><h3>${post.title}</h3><p>${post.price}</p><span class="status-pill">منتشرشده</span></div><button class="secondary-button">مدیریت آگهی</button></article>`).join('');

function route(){
  const requested = location.hash.replace(/^#\//,'').split(/[/?]/)[0] || 'home';
  const current = routes.has(requested) ? requested : 'home';
  document.querySelectorAll('[data-view]').forEach(view => { view.hidden = view.dataset.view !== current; });
  document.querySelectorAll('.bottom-nav a').forEach(link => link.classList.toggle('active',link.hash === `#/${current}` || (current === 'post' && link.hash === '#/search')));
  document.title = `${({home:'بازار آگهی',search:'جست‌وجوی آگهی',post:'جزئیات آگهی',account:'حساب من',system:'سیستم طراحی'})[current]} — هفت‌سو`;
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  document.querySelector('#main').focus({preventScroll:true});
}
window.addEventListener('hashchange',route); route();

function submitSearch(value){
  const query = value.trim();
  document.querySelector('#listing-title').textContent = query ? `نتایج «${query}»` : `آگهی‌های ${document.querySelector('#selected-city').textContent}`;
  location.hash = '#/search';
}
document.querySelector('#header-search').addEventListener('submit',event => {event.preventDefault();submitSearch(document.querySelector('#q').value)});
document.querySelector('#hero-search').addEventListener('submit',event => {event.preventDefault();submitSearch(document.querySelector('#hero-q').value)});
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click',()=>submitSearch(button.dataset.query)));

const savedTheme = localStorage.getItem('haftsoo-theme');
if(savedTheme) document.documentElement.dataset.theme = savedTheme;
document.querySelector('.theme-button').addEventListener('click',()=>{
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem('haftsoo-theme',next); showToast(next === 'dark'?'پوسته تیره فعال شد':'پوسته روشن فعال شد');
});

function openDialog(id,trigger){
  const backdrop = document.getElementById(id); if(!backdrop) return;
  lastFocused = trigger; backdrop.hidden = false; document.body.style.overflow='hidden';
  requestAnimationFrame(()=>backdrop.querySelector('input,button').focus());
}
function closeDialog(backdrop){backdrop.hidden=true;document.body.style.overflow='';lastFocused?.focus();}
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openDialog(button.dataset.open,button)));
document.querySelectorAll('.dialog-backdrop').forEach(backdrop=>{
  backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeDialog(backdrop)});
  backdrop.querySelectorAll('.dialog-close').forEach(button=>button.addEventListener('click',()=>closeDialog(backdrop)));
  backdrop.addEventListener('keydown',event=>{
    if(event.key==='Escape') closeDialog(backdrop);
    if(event.key==='Tab'){
      const focusable=[...backdrop.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')];
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()} else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
});

document.querySelector('.city-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-city]'); if(!button)return;
  document.querySelector('#selected-city').textContent=button.dataset.city;
  document.querySelector('#listing-title').textContent=`آگهی‌های ${button.dataset.city}`;
  closeDialog(document.querySelector('#city-dialog')); showToast(`شهر ${button.dataset.city} انتخاب شد`);
});
document.querySelector('#city-search').addEventListener('input',event=>{
  const value=event.target.value.trim(); document.querySelectorAll('[data-city]').forEach(button=>button.hidden=!button.dataset.city.includes(value));
});
document.querySelector('.apply-filter').addEventListener('click',()=>{closeDialog(document.querySelector('#filter-dialog'));document.querySelector('#result-count').textContent='۱۲';showToast('فیلترها اعمال شدند')});
document.querySelector('.clear-filters').addEventListener('click',()=>showToast('فیلترها پاک شدند'));

document.addEventListener('click',event=>{
  const bookmark=event.target.closest('[data-bookmark],.bookmark-button');
  if(bookmark){bookmark.classList.toggle('active');bookmark.setAttribute('aria-pressed',String(bookmark.classList.contains('active')));showToast(bookmark.classList.contains('active')?'آگهی نشان شد':'نشان برداشته شد')}
});
document.querySelector('.reveal-contact').addEventListener('click',event=>{event.currentTarget.hidden=true;document.querySelector('.contact-box').hidden=false;showToast('اطلاعات تماس نمایش داده شد')});

let toastTimer;
function showToast(message){const toast=document.querySelector('.toast');toast.textContent=message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,2600)}

document.querySelectorAll('.submit-button,.bottom-submit').forEach(button=>button.addEventListener('click',()=>showToast('فرآیند ثبت آگهی در استیج محصول فعال می‌شود')));
